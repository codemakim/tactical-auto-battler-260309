import type { BattleState, BattleUnit, HeroAbility, HeroType, QueuedEditData } from '../types';
import { BattlePhase, Team, Position, HeroType as HeroTypeConst, DEFAULT_GAME_CONFIG } from '../types';
import { uid } from '../utils/uid';
import { startRound, executeTurn, isRoundComplete } from './RoundManager';
import { recordSnapshot, type ReplaySnapshot } from './ReplayRecorder';
import { canIntervene, executeIntervention } from '../systems/HeroInterventionSystem';
import { resetBattleActions } from '../systems/ActionCardSystem';
import { getHeroDefinition } from '../data/HeroDefinitions';

/**
 * 초기 BattleState 생성
 */
/**
 * 유닛의 현재 actionSlots를 preBattleActionSlots에 스냅샷
 */
function snapshotActionSlots(unit: BattleUnit): BattleUnit {
  return {
    ...unit,
    preBattleActionSlots: unit.actionSlots.map(slot => ({ ...slot })),
  };
}

export function createBattleState(
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[],
  playerReserve: BattleUnit[],
  enemyReserve: BattleUnit[],
  seed?: number,
  heroType?: HeroType,
): BattleState {
  // 전투 시작 시 모든 유닛의 actionSlots 스냅샷 (전투 후 원복용)
  const allUnits = [...playerUnits, ...enemyUnits].map(snapshotActionSlots);
  const allReserve = [...playerReserve, ...enemyReserve].map(snapshotActionSlots);

  return {
    units: allUnits,
    reserve: allReserve,
    hero: {
      heroType: heroType ?? HeroTypeConst.COMMANDER,
      interventionsRemaining: DEFAULT_GAME_CONFIG.heroInterventionsPerRound,
      maxInterventionsPerRound: DEFAULT_GAME_CONFIG.heroInterventionsPerRound,
      abilities: getHeroDefinition(heroType ?? HeroTypeConst.COMMANDER)?.abilities ?? [],
    },
    round: 0,
    turn: 0,
    turnOrder: [],
    phase: BattlePhase.ROUND_START,
    events: [],
    delayedEffects: [],
    isFinished: false,
    winner: null,
    seed: seed ?? Date.now(),
  };
}

/**
 * 전투 종료 후 모든 유닛의 actionSlots를 전투 시작 전 상태로 복원.
 * 영웅이 전투 중 편집한 카드 변경을 되돌린다.
 */
export function restorePreBattleActions(state: BattleState): BattleState {
  return {
    ...state,
    units: state.units.map(resetBattleActions),
    reserve: state.reserve.map(resetBattleActions),
  };
}

/**
 * 전투를 한 스텝 진행 (UI에서 호출).
 * 라운드 시작 → 턴 실행 반복 → 라운드 종료 → 다음 라운드 시작 ...
 */
export function stepBattle(state: BattleState): {
  state: BattleState;
  snapshot?: ReplaySnapshot;
} {
  if (state.isFinished) return { state };

  // 라운드 시작 또는 라운드 종료 후 → 새 라운드 시작
  if (state.phase === BattlePhase.ROUND_START || state.phase === BattlePhase.ROUND_END) {
    if (state.round >= DEFAULT_GAME_CONFIG.maxRoundsPerBattle) {
      // 최대 라운드 초과 → 강제 종료 (무승부 = ENEMY 승리)
      const endEvent: import('../types').BattleEvent = {
        id: uid(),
        type: 'BATTLE_END',
        round: state.round,
        turn: state.turn,
        timestamp: Date.now(),
        data: { winner: Team.ENEMY, reason: 'max_rounds_exceeded' },
      };
      return {
        state: {
          ...state,
          isFinished: true,
          winner: Team.ENEMY,
          phase: BattlePhase.BATTLE_END,
          events: [...state.events, endEvent],
        },
      };
    }

    const newState = startRound(state);
    const snapshot = recordSnapshot(newState);
    return { state: newState, snapshot };
  }

  // 턴 실행
  if (state.phase === BattlePhase.TURN_START || state.phase === BattlePhase.TURN_END) {
    if (isRoundComplete(state)) {
      return { state: { ...state, phase: BattlePhase.ROUND_END } };
    }
    const newState = executeTurn(state);
    return { state: newState };
  }

  // ACTION_RESOLVE 중이면 턴 종료로 전환
  if (state.phase === BattlePhase.ACTION_RESOLVE) {
    return { state: { ...state, phase: BattlePhase.TURN_END } };
  }

  return { state };
}

/**
 * 전투 전체 자동 실행 (테스트/시뮬레이션용)
 */
export function runFullBattle(state: BattleState): BattleState {
  let current = state;
  let steps = 0;
  const maxSteps = 500; // 무한루프 방지

  while (!current.isFinished && steps < maxSteps) {
    const result = stepBattle(current);
    current = result.state;
    steps++;
  }

  return current;
}

/**
 * 히어로 개입 큐잉 (§18).
 * 즉시 실행하지 않고 다음 유닛 행동 직전에 실행되도록 대기열에 넣는다.
 */
export function queueIntervention(
  state: BattleState,
  ability: HeroAbility,
  targetUnitId?: string,
  editData?: QueuedEditData,
): BattleState {
  if (!canIntervene(state)) return state;

  return {
    ...state,
    hero: {
      ...state.hero,
      queuedAbility: ability,
      queuedTargetId: targetUnitId,
      queuedEditData: editData,
    },
  };
}

/**
 * 히어로 개입 실행 (UI에서 호출).
 * §18 스펙: 즉시 실행이 아닌 큐잉 방식 - 다음 유닛 행동 직전에 발동.
 */
export function heroIntervene(
  state: BattleState,
  ability: HeroAbility,
  targetUnitId?: string,
): BattleState {
  return queueIntervention(state, ability, targetUnitId);
}
