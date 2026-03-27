/**
 * 전투 결과 계산 테스트
 *
 * battle-result-ui-spec.md §2 기반
 * calculateBattleResult() 순수 함수 검증
 *
 * 카테고리:
 * 1. 승리 — victory=true, canRetry=false
 * 2. 패배 + 리트라이 가능 — victory=false, canRetry=true
 * 3. 패배 + 리트라이 불가 — victory=false, canRetry=false
 * 4. 골드 계산 — calculateGoldReward와 일치
 * 5. 생존/전사 유닛 분류 — SurvivorInfo 매핑
 * 6. 스테이지 정보 — RunState 값 반영
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateBattleResult } from '../systems/BattleResultCalculator';
import { calculateGoldReward } from '../systems/BattleRewardSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { createBattleState, runFullBattle } from '../core/BattleEngine';
import { Team, Position, Difficulty, RunStatus, BattlePhase } from '../types';
import type { BattleState, RunState, BattleUnit } from '../types';

// ─── 헬퍼 ────────────────────────────────

function makeUnit(name: string, cls: string, team: Team, pos: Position, hp?: number): BattleUnit {
  const def = createCharacterDef(name, cls);
  const unit = createUnit(def, team, pos);
  if (hp !== undefined) {
    return { ...unit, stats: { ...unit.stats, hp }, isAlive: hp > 0 };
  }
  return unit;
}

function makeRunState(overrides?: Partial<RunState>): RunState {
  return {
    currentStage: 1,
    maxStages: 5,
    seed: 42,
    party: [],
    bench: [],
    cardInventory: [],
    equippedCards: {},
    gold: 0,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: [],
    ...overrides,
  };
}

/** 완료된 BattleState를 직접 구성 */
function makeFinishedState(opts: {
  winner: Team;
  round: number;
  playerUnits: BattleUnit[];
  enemyUnits?: BattleUnit[];
}): BattleState {
  const enemyUnits = opts.enemyUnits ?? [
    makeUnit('Enemy', 'WARRIOR', Team.ENEMY, Position.FRONT, opts.winner === Team.PLAYER ? 0 : 30),
  ];
  // 적군도 승리 시 죽음 처리
  if (opts.winner === Team.PLAYER) {
    enemyUnits.forEach((u) => {
      u.stats.hp = 0;
      u.isAlive = false;
    });
  }

  return {
    units: [...opts.playerUnits, ...enemyUnits],
    hero: {
      heroType: 'COMMANDER' as any,
      maxInterventionsPerRound: 1,
      interventionsRemaining: 0,
      abilities: [],
    },
    round: opts.round,
    turn: 0,
    phase: BattlePhase.BATTLE_END,
    turnOrder: [],
    events: [],
    delayedEffects: [],
    isFinished: true,
    winner: opts.winner,
    seed: 42,
  };
}

beforeEach(() => {
  resetUnitCounter();
});

// ═══════════════════════════════════════════
// 1. 승리
// ═══════════════════════════════════════════

describe('승리', () => {
  it('winner === PLAYER → victory: true', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT)];
    const state = makeFinishedState({ winner: Team.PLAYER, round: 3, playerUnits: units });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);

    expect(result.victory).toBe(true);
  });

  it('승리 시 canRetry는 항상 false', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT)];
    const state = makeFinishedState({ winner: Team.PLAYER, round: 2, playerUnits: units });
    const run = makeRunState({ retryAvailable: true });

    const result = calculateBattleResult(state, run);

    expect(result.canRetry).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 2. 패배 + 리트라이 가능
// ═══════════════════════════════════════════

describe('패배 + 리트라이 가능', () => {
  it('winner === ENEMY, retryAvailable → canRetry: true', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT, 0)];
    units[0].isAlive = false;
    const state = makeFinishedState({ winner: Team.ENEMY, round: 5, playerUnits: units });
    const run = makeRunState({ retryAvailable: true });

    const result = calculateBattleResult(state, run);

    expect(result.victory).toBe(false);
    expect(result.canRetry).toBe(true);
  });
});

// ═══════════════════════════════════════════
// 3. 패배 + 리트라이 불가
// ═══════════════════════════════════════════

describe('패배 + 리트라이 불가', () => {
  it('retryAvailable === false → canRetry: false', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT, 0)];
    units[0].isAlive = false;
    const state = makeFinishedState({ winner: Team.ENEMY, round: 4, playerUnits: units });
    const run = makeRunState({ retryAvailable: false });

    const result = calculateBattleResult(state, run);

    expect(result.victory).toBe(false);
    expect(result.canRetry).toBe(false);
  });
});

// ═══════════════════════════════════════════
// 4. 골드 계산
// ═══════════════════════════════════════════

describe('골드 계산', () => {
  it('goldEarned가 calculateGoldReward와 동일', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT)];
    const state = makeFinishedState({ winner: Team.PLAYER, round: 3, playerUnits: units });
    const run = makeRunState();

    const result = calculateBattleResult(state, run, Difficulty.STANDARD);
    const expected = calculateGoldReward(state, Difficulty.STANDARD);

    expect(result.goldEarned).toBe(expected);
  });

  it('난이도별 골드 차이 반영', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT)];
    const state = makeFinishedState({ winner: Team.PLAYER, round: 3, playerUnits: units });
    const run = makeRunState();

    const easy = calculateBattleResult(state, run, Difficulty.EASY);
    const hard = calculateBattleResult(state, run, Difficulty.HARD);

    expect(hard.goldEarned).toBeGreaterThan(easy.goldEarned);
  });

  it('패배 시 골드 감소', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT, 0)];
    units[0].isAlive = false;
    const winState = makeFinishedState({
      winner: Team.PLAYER,
      round: 3,
      playerUnits: [makeUnit('B', 'WARRIOR', Team.PLAYER, Position.FRONT)],
    });
    const loseState = makeFinishedState({ winner: Team.ENEMY, round: 3, playerUnits: units });
    const run = makeRunState();

    const winResult = calculateBattleResult(winState, run);
    const loseResult = calculateBattleResult(loseState, run);

    expect(loseResult.goldEarned).toBeLessThan(winResult.goldEarned);
  });
});

// ═══════════════════════════════════════════
// 5. 생존/전사 유닛 분류
// ═══════════════════════════════════════════

describe('생존/전사 유닛 분류', () => {
  it('생존 2명 + 전사 1명 올바르게 분류', () => {
    const alive1 = makeUnit('Alice', 'WARRIOR', Team.PLAYER, Position.FRONT, 50);
    const alive2 = makeUnit('Bob', 'ARCHER', Team.PLAYER, Position.BACK, 30);
    const dead = makeUnit('Charlie', 'LANCER', Team.PLAYER, Position.FRONT, 0);
    dead.isAlive = false;

    const state = makeFinishedState({ winner: Team.PLAYER, round: 4, playerUnits: [alive1, alive2, dead] });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);

    expect(result.survivingAllies).toHaveLength(2);
    expect(result.fallenAllies).toHaveLength(1);
  });

  it('SurvivorInfo 필드가 올바르게 매핑됨', () => {
    const unit = makeUnit('Alice', 'ARCHER', Team.PLAYER, Position.BACK, 25);
    const state = makeFinishedState({ winner: Team.PLAYER, round: 2, playerUnits: [unit] });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);
    const info = result.survivingAllies[0];

    expect(info.name).toBe('Alice');
    expect(info.characterClass).toBe('ARCHER');
    expect(info.currentHp).toBe(25);
    expect(info.maxHp).toBe(unit.stats.maxHp);
  });

  it('전사 유닛 HP는 0으로 표시', () => {
    const dead = makeUnit('Dead', 'WARRIOR', Team.PLAYER, Position.FRONT, -5);
    dead.isAlive = false;

    const state = makeFinishedState({ winner: Team.ENEMY, round: 3, playerUnits: [dead] });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);

    expect(result.fallenAllies[0].currentHp).toBe(0);
  });

  it('전원 생존 시 fallenAllies 비어있음', () => {
    const units = [
      makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT),
      makeUnit('B', 'ARCHER', Team.PLAYER, Position.BACK),
      makeUnit('C', 'GUARDIAN', Team.PLAYER, Position.FRONT),
    ];
    const state = makeFinishedState({ winner: Team.PLAYER, round: 2, playerUnits: units });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);

    expect(result.survivingAllies).toHaveLength(3);
    expect(result.fallenAllies).toHaveLength(0);
  });

  it('전원 전사 시 survivingAllies 비어있음', () => {
    const units = [
      makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT, 0),
      makeUnit('B', 'ARCHER', Team.PLAYER, Position.BACK, 0),
    ];
    units.forEach((u) => (u.isAlive = false));
    const state = makeFinishedState({ winner: Team.ENEMY, round: 6, playerUnits: units });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);

    expect(result.survivingAllies).toHaveLength(0);
    expect(result.fallenAllies).toHaveLength(2);
  });

  it('적군 유닛은 결과에 포함되지 않음', () => {
    const ally = makeUnit('Ally', 'WARRIOR', Team.PLAYER, Position.FRONT);
    const enemy = makeUnit('Enemy', 'WARRIOR', Team.ENEMY, Position.FRONT, 0);
    enemy.isAlive = false;

    const state = makeFinishedState({
      winner: Team.PLAYER,
      round: 2,
      playerUnits: [ally],
      enemyUnits: [enemy],
    });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);

    expect(result.survivingAllies).toHaveLength(1);
    expect(result.fallenAllies).toHaveLength(0);
    // 적군은 포함 안 됨
    const allNames = [...result.survivingAllies, ...result.fallenAllies].map((s) => s.name);
    expect(allNames).not.toContain('Enemy');
  });
});

// ═══════════════════════════════════════════
// 6. 스테이지 정보
// ═══════════════════════════════════════════

describe('스테이지 정보', () => {
  it('RunState의 currentStage, maxStages 반영', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT)];
    const state = makeFinishedState({ winner: Team.PLAYER, round: 2, playerUnits: units });
    const run = makeRunState({ currentStage: 3, maxStages: 5 });

    const result = calculateBattleResult(state, run);

    expect(result.currentStage).toBe(3);
    expect(result.maxStages).toBe(5);
  });

  it('라운드 수 반영', () => {
    const units = [makeUnit('A', 'WARRIOR', Team.PLAYER, Position.FRONT)];
    const state = makeFinishedState({ winner: Team.PLAYER, round: 7, playerUnits: units });
    const run = makeRunState();

    const result = calculateBattleResult(state, run);

    expect(result.roundsElapsed).toBe(7);
  });
});

// ═══════════════════════════════════════════
// 7. 엔진 통합 — 실제 전투 결과로 검증
// ═══════════════════════════════════════════

describe('엔진 통합', () => {
  it('runFullBattle 결과로 calculateBattleResult 호출 가능', () => {
    resetUnitCounter();
    const p1 = createUnit(createCharacterDef('Hero', 'WARRIOR'), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('Archer', 'ARCHER'), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('Foe', 'WARRIOR'), Team.ENEMY, Position.FRONT);

    const battleState = runFullBattle(createBattleState([p1, p2], [e1], 999));
    const run = makeRunState({ currentStage: 2 });

    const result = calculateBattleResult(battleState, run);

    expect(result.victory).toBe(battleState.winner === Team.PLAYER);
    expect(result.roundsElapsed).toBe(battleState.round);
    expect(result.goldEarned).toBeGreaterThan(0);
    expect(result.survivingAllies.length + result.fallenAllies.length).toBeGreaterThan(0);
    expect(result.currentStage).toBe(2);
  });
});
