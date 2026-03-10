import type { BattleState, BattleUnit, CharacterDefinition, HeroAbility } from '../types';
import { BattlePhase, Team, Position, DEFAULT_GAME_CONFIG } from '../types';
import { uid } from '../utils/uid';
import { startRound, executeTurn, isRoundComplete } from './RoundManager';
import { recordSnapshot, type ReplaySnapshot } from './ReplayRecorder';
import { canIntervene, executeIntervention } from '../systems/HeroInterventionSystem';

/**
 * CharacterDefinition에서 BattleUnit 생성 (순수 함수)
 */
export function createBattleUnit(
  def: CharacterDefinition,
  team: Team,
  position: Position,
  index: number,
): BattleUnit {
  return {
    id: `${team}_${index}_${def.id}`,
    definitionId: def.id,
    name: def.name,
    characterClass: def.characterClass,
    team,
    position,
    stats: {
      hp: def.baseStats.hp,
      maxHp: def.baseStats.hp,
      atk: def.baseStats.atk,
      def: def.baseStats.def,
      agi: def.baseStats.agi,
    },
    shield: 0,
    buffs: [],
    actionSlots: [
      // 기본 액션은 항상 마지막 슬롯 (ALWAYS 조건)
      { condition: { type: 'ALWAYS' }, action: def.basicAction },
    ],
    isAlive: true,
    hasActedThisRound: false,
  };
}

/**
 * 초기 BattleState 생성
 */
export function createBattleState(
  playerUnits: BattleUnit[],
  enemyUnits: BattleUnit[],
  playerReserve: BattleUnit[],
  enemyReserve: BattleUnit[],
  seed?: number,
): BattleState {
  return {
    units: [...playerUnits, ...enemyUnits],
    reserve: [...playerReserve, ...enemyReserve],
    hero: {
      interventionsRemaining: DEFAULT_GAME_CONFIG.heroInterventionsPerRound,
      maxInterventionsPerRound: DEFAULT_GAME_CONFIG.heroInterventionsPerRound,
      abilities: [],
    },
    round: 0,
    turn: 0,
    turnOrder: [],
    phase: BattlePhase.ROUND_START,
    events: [],
    isFinished: false,
    winner: null,
    seed: seed ?? Date.now(),
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
): BattleState {
  if (!canIntervene(state)) return state;

  return {
    ...state,
    hero: {
      ...state.hero,
      queuedAbility: ability,
      queuedTargetId: targetUnitId,
    },
  };
}

/**
 * 히어로 개입 즉시 실행 (UI에서 호출)
 */
export function heroIntervene(
  state: BattleState,
  ability: HeroAbility,
  targetUnitId?: string,
): BattleState {
  if (!canIntervene(state)) return state;

  const result = executeIntervention(state, ability, targetUnitId);
  return {
    ...result.state,
    events: [...state.events, ...result.events],
  };
}
