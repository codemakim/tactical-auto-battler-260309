import type { BattleState, BattleEvent, BattleUnit } from '../types';
import { BattlePhase, Team, Position } from '../types';
import { uid } from '../utils/uid';
import { calculateFullTurnOrder, calculateTurnOrder } from './TurnOrderManager';
import { selectAction, executeAction } from '../systems/ActionResolver';
import { processStatusEffects, tickBuffs } from '../systems/BuffSystem';
import { executeQueuedAbility } from '../systems/HeroInterventionSystem';
import { resolveDelayedEffects } from '../systems/DelayedEffectSystem';

/**
 * 라운드 시작: 턴 순서 계산, 유닛 상태 초기화
 */
export function startRound(state: BattleState): BattleState {
  const newRound = state.round + 1;
  let units = state.units.map(u => ({ ...u, hasActedThisRound: false }));
  const turnOrder = calculateFullTurnOrder(units);

  const event: BattleEvent = {
    id: uid(),
    type: 'ROUND_START',
    round: newRound,
    turn: 0,
    timestamp: Date.now(),
    data: { turnOrder },
  };

  const statusEvents: BattleEvent[] = [];

  // §6.5: 라운드 시작 시 상태이상 처리 (POISON, REGEN)
  units = units.map(u => {
    if (!u.isAlive || u.buffs.length === 0) return u;
    const result = processStatusEffects(u, newRound, 0);
    statusEvents.push(...result.events);
    return result.unit;
  });

  return {
    ...state,
    units,
    round: newRound,
    turn: 0,
    turnOrder,
    phase: BattlePhase.TURN_START,
    hero: {
      ...state.hero,
      interventionsRemaining: state.hero.maxInterventionsPerRound,
    },
    events: [...state.events, event, ...statusEvents],
  };
}

/**
 * 다음 행동할 유닛 가져오기
 */
export function getNextActor(state: BattleState): BattleUnit | null {
  // 아직 행동하지 않은 유닛 중 턴 순서대로
  const remaining = calculateTurnOrder(state.units);
  if (remaining.length === 0) return null;

  const nextId = remaining[0];
  return state.units.find(u => u.id === nextId) ?? null;
}

/**
 * 한 유닛의 턴 실행
 */
export function executeTurn(state: BattleState): BattleState {
  const actor = getNextActor(state);
  if (!actor) {
    return endRound(state);
  }

  const newTurn = state.turn + 1;
  let currentState = { ...state, turn: newTurn, phase: BattlePhase.ACTION_RESOLVE as BattlePhase };
  const allEvents: BattleEvent[] = [];

  allEvents.push({
    id: uid(),
    type: 'TURN_START',
    round: currentState.round,
    turn: newTurn,
    timestamp: Date.now(),
    sourceId: actor.id,
    data: { unitName: actor.name },
  });

  // §18: 큐잉된 히어로 개입이 있으면 유닛 행동 직전에 먼저 실행
  if (currentState.hero.queuedAbility) {
    const interventionResult = executeQueuedAbility(currentState);
    currentState = {
      ...interventionResult.state,
      hero: {
        ...interventionResult.state.hero,
        queuedAbility: undefined,
        queuedTargetId: undefined,
        queuedEditData: undefined,
      },
    };
    allEvents.push(...interventionResult.events);
  }

  // 액션 선택
  const selectedSlot = selectAction(actor, currentState);

  if (selectedSlot === 'STUNNED') {
    // 스턴 상태: 행동 불가
    allEvents.push({
      id: uid(),
      type: 'ACTION_SKIPPED',
      round: currentState.round,
      turn: newTurn,
      timestamp: Date.now(),
      sourceId: actor.id,
      data: { reason: 'stunned' },
    });
  } else if (selectedSlot) {
    const result = executeAction(actor, selectedSlot, currentState);
    currentState = { ...currentState, units: result.units };
    if (result.turnOrder) {
      currentState = { ...currentState, turnOrder: result.turnOrder };
    }
    if (result.delayedEffects) {
      currentState = {
        ...currentState,
        delayedEffects: [...(currentState.delayedEffects ?? []), ...result.delayedEffects],
      };
    }
    allEvents.push(...result.events);
  } else {
    // 턴 손실
    allEvents.push({
      id: uid(),
      type: 'ACTION_SKIPPED',
      round: currentState.round,
      turn: newTurn,
      timestamp: Date.now(),
      sourceId: actor.id,
      data: { reason: 'no_valid_action' },
    });
  }

  // 행동 완료 마킹
  const units = currentState.units.map(u =>
    u.id === actor.id ? { ...u, hasActedThisRound: true } : u,
  );

  // 예비 유닛 투입 체크
  const { units: unitsAfterReserve, reserve, events: reserveEvents } =
    checkReserveEntry({ ...currentState, units });

  allEvents.push(...reserveEvents);

  // 승패 판정
  const winner = checkWinner(unitsAfterReserve);
  const isFinished = winner !== null;

  if (isFinished) {
    allEvents.push({
      id: uid(),
      type: 'BATTLE_END',
      round: currentState.round,
      turn: newTurn,
      timestamp: Date.now(),
      data: { winner },
    });
  }

  return {
    ...currentState,
    units: unitsAfterReserve,
    reserve,
    phase: isFinished ? BattlePhase.BATTLE_END : BattlePhase.TURN_END,
    isFinished,
    winner,
    events: [...currentState.events, ...allEvents],
  };
}

/**
 * 라운드 종료
 */
export function endRound(state: BattleState): BattleState {
  const buffEvents: BattleEvent[] = [];

  // §7.1: 버프/디버프 지속시간 감소
  let units = state.units.map(u => {
    if (!u.isAlive || u.buffs.length === 0) return u;
    const result = tickBuffs(u, state.round, state.turn);
    buffEvents.push(...result.events);
    return result.unit;
  });

  // §7.2: 지연 효과 카운트다운 및 발동
  let delayedEffects = state.delayedEffects ?? [];
  const delayedEvents: BattleEvent[] = [];
  if (delayedEffects.length > 0) {
    const result = resolveDelayedEffects({ ...state, units, delayedEffects });
    units = result.state.units;
    delayedEffects = result.state.delayedEffects;
    delayedEvents.push(...result.events);
  }

  // §7: 라운드 종료 시 모든 살아있는 유닛의 실드 제거
  const shieldEvents: BattleEvent[] = [];
  units = units.map(u => {
    if (!u.isAlive || u.shield <= 0) return u;
    shieldEvents.push({
      id: uid(),
      type: 'SHIELD_CLEARED',
      round: state.round,
      turn: state.turn,
      timestamp: Date.now(),
      targetId: u.id,
      data: { shieldBefore: u.shield },
    });
    return { ...u, shield: 0 };
  });

  const event: BattleEvent = {
    id: uid(),
    type: 'ROUND_END',
    round: state.round,
    turn: state.turn,
    timestamp: Date.now(),
  };

  return {
    ...state,
    units,
    delayedEffects,
    phase: BattlePhase.ROUND_END,
    events: [...state.events, ...buffEvents, ...delayedEvents, ...shieldEvents, event],
  };
}

/**
 * 라운드가 끝났는지 (모든 유닛이 행동했는지)
 */
export function isRoundComplete(state: BattleState): boolean {
  return state.units
    .filter(u => u.isAlive)
    .every(u => u.hasActedThisRound);
}

/**
 * 예비 유닛 투입 확인
 */
function checkReserveEntry(
  state: BattleState,
): { units: BattleUnit[]; reserve: BattleUnit[]; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  const units = [...state.units];
  const reserve = [...state.reserve];

  // 각 팀별로 죽은 유닛이 있고 예비가 있으면 투입
  for (const team of [Team.PLAYER, Team.ENEMY]) {
    const deadCount = units.filter(u => u.team === team && !u.isAlive).length;
    if (deadCount > 0) {
      const reserveUnit = reserve.find(u => u.team === team && u.isAlive);
      if (reserveUnit) {
        // 예비 유닛을 전투에 투입
        const idx = reserve.indexOf(reserveUnit);
        reserve.splice(idx, 1);
        // 스펙 §16: 예비 유닛은 항상 BACK에 진입, 투입 라운드에는 행동 불가
        units.push({ ...reserveUnit, position: Position.BACK, hasActedThisRound: true });

        events.push({
          id: uid(),
          type: 'RESERVE_ENTERED',
          round: state.round,
          turn: state.turn,
          timestamp: Date.now(),
          targetId: reserveUnit.id,
          data: { team, position: Position.BACK },
        });
      }
    }
  }

  return { units, reserve, events };
}

/**
 * 승패 판정: 한쪽이 전멸하면 반대편 승리
 */
function checkWinner(units: BattleUnit[]): Team | null {
  const playerAlive = units.some(u => u.team === Team.PLAYER && u.isAlive);
  const enemyAlive = units.some(u => u.team === Team.ENEMY && u.isAlive);

  if (!playerAlive) return Team.ENEMY;
  if (!enemyAlive) return Team.PLAYER;
  return null;
}
