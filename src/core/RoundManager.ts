import type { BattleState, BattleEvent, BattleUnit } from '../types';
import { BattlePhase, Team } from '../types';
import { uid } from '../utils/uid';
import { calculateFullTurnOrder, calculateTurnOrder } from './TurnOrderManager';
import { selectAction, executeAction } from '../systems/ActionResolver';
import { processStatusEffects, tickBuffs } from '../systems/BuffSystem';
import { executeQueuedAbility } from '../systems/HeroInterventionSystem';
import { resolveDelayedEffects } from '../systems/DelayedEffectSystem';
import { checkStalemate } from '../systems/StalemateDetector';

/**
 * 라운드 시작: 턴 순서 계산, 유닛 상태 초기화
 */
export function startRound(state: BattleState): BattleState {
  const newRound = state.round + 1;
  let units = state.units.map((u) => ({ ...u, hasActedThisRound: false }));
  // 방어 우선권 판단을 위해 임시 state 생성 (units 업데이트 반영)
  const tempState = { ...state, units, round: newRound, turn: 0 };
  const turnOrder = calculateFullTurnOrder(units, tempState);

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
  units = units.map((u) => {
    if (!u.isAlive || u.buffs.length === 0) return u;
    const result = processStatusEffects(u, newRound, 0);
    statusEvents.push(...result.events);
    return result.unit;
  });

  // 독 데미지로 한쪽이 전멸했으면 즉시 전투 종료
  const winner = checkWinner(units);
  if (winner !== null) {
    const endEvent: BattleEvent = {
      id: uid(),
      type: 'BATTLE_END',
      round: newRound,
      turn: 0,
      timestamp: Date.now(),
      data: { winner, reason: 'poison_death' },
    };
    return {
      ...state,
      units,
      round: newRound,
      turn: 0,
      turnOrder,
      phase: BattlePhase.BATTLE_END,
      isFinished: true,
      winner,
      hero: {
        ...state.hero,
        interventionsRemaining: state.hero.maxInterventionsPerRound,
        queuedAbility: undefined,
        queuedTargetId: undefined,
        queuedEditData: undefined,
      },
      events: [...state.events, event, ...statusEvents, endEvent],
    };
  }

  // §22.1 교착 방지 검사
  const preStaleState: BattleState = {
    ...state,
    units,
    round: newRound,
    turn: 0,
    turnOrder,
    phase: BattlePhase.TURN_START,
    hero: {
      ...state.hero,
      interventionsRemaining: state.hero.maxInterventionsPerRound,
      queuedAbility: undefined,
      queuedTargetId: undefined,
      queuedEditData: undefined,
    },
    events: [...state.events, event, ...statusEvents],
  };

  const stalemateResult = checkStalemate(preStaleState);
  const staleEvents = stalemateResult.events;
  let resultState = stalemateResult.state;

  if (staleEvents.length > 0) {
    resultState = {
      ...resultState,
      events: [...resultState.events, ...staleEvents],
    };
  }

  return resultState;
}

/**
 * 다음 행동할 유닛 가져오기.
 * 라운드 시작 시 확정된 state.turnOrder를 기준으로,
 * 아직 행동하지 않은 첫 유닛을 반환한다.
 * (라운드 중 HP 변화 등으로 순서가 뒤바뀌지 않도록 캐시 사용)
 */
export function getNextActor(state: BattleState): BattleUnit | null {
  for (const unitId of state.turnOrder) {
    const unit = state.units.find((u) => u.id === unitId);
    if (unit && unit.isAlive && !unit.hasActedThisRound) {
      return unit;
    }
  }
  return null;
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
  const units = currentState.units.map((u) => (u.id === actor.id ? { ...u, hasActedThisRound: true } : u));

  // 승패 판정
  const winner = checkWinner(units);
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
    units,
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
  let units = state.units.map((u) => {
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
  units = units.map((u) => {
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
  return state.units.filter((u) => u.isAlive).every((u) => u.hasActedThisRound);
}

/**
 * 승패 판정: 한쪽이 전멸하면 반대편 승리
 */
function checkWinner(units: BattleUnit[]): Team | null {
  const playerAlive = units.some((u) => u.team === Team.PLAYER && u.isAlive);
  const enemyAlive = units.some((u) => u.team === Team.ENEMY && u.isAlive);

  if (!playerAlive) return Team.ENEMY;
  if (!enemyAlive) return Team.PLAYER;
  return null;
}
