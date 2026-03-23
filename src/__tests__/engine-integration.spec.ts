/**
 * 엔진 통합 테스트 — Scene이 엔진을 소비할 때 의존하는 계약 검증
 *
 * Scene은 Phaser 의존이라 직접 테스트 어려우므로,
 * Scene이 가정하는 엔진 동작을 순수 로직으로 검증한다.
 *
 * 카테고리:
 * 1. Phase 전이 — stepBattle 호출 시 phase가 어떻게 바뀌는지
 * 2. 턴 실행 — 한 스텝 = 정확히 한 유닛 행동
 * 3. 이벤트 구조 — UI가 참조하는 이벤트 필드가 실제로 존재하는지
 * 4. 스타터 캐릭터 — 초기 편성 캐릭터가 실전에서 기능하는지
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle } from '../core/BattleEngine';
import { startRound, executeTurn, getNextActor, isRoundComplete } from '../core/RoundManager';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { generateEncounter } from '../systems/EnemyGenerator';
import { Team, Position, BattlePhase, CharacterClass } from '../types';
import type { BattleState, BattleEvent } from '../types';

// ─── 헬퍼 ────────────────────────────────

function makeStarter(name: string, cls: string, team: Team, pos: Position) {
  const def = createCharacterDef(name, cls);
  return createUnit(def, team, pos);
}

/** stepBattle을 반복 호출하여 특정 phase에 도달 */
function advanceTo(state: BattleState, targetPhase: string, maxSteps = 20): BattleState {
  let s = state;
  for (let i = 0; i < maxSteps && s.phase !== targetPhase && !s.isFinished; i++) {
    s = stepBattle(s).state;
  }
  return s;
}

/** 한 유닛이 행동할 때까지 진행 (Scene의 doStep과 동일한 로직) */
function doOneStep(state: BattleState): { state: BattleState; newEvents: BattleEvent[] } {
  const prevCount = state.events.length;
  let s = state;
  for (let i = 0; i < 10 && !s.isFinished; i++) {
    const phaseBefore = s.phase;
    s = stepBattle(s).state;
    if (phaseBefore === BattlePhase.TURN_START || phaseBefore === BattlePhase.TURN_END) break;
    if (s.phase === BattlePhase.BATTLE_END) break;
  }
  return { state: s, newEvents: s.events.slice(prevCount) };
}

// ─── 1. Phase 전이 ────────────────────────

describe('Phase 전이 규칙', () => {
  let state: BattleState;

  beforeEach(() => {
    resetUnitCounter();
    const p1 = makeStarter('A', CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
    const e1 = makeStarter('E', CharacterClass.WARRIOR, Team.ENEMY, Position.FRONT);
    state = createBattleState([p1], [e1], [], [], 42);
  });

  it('초기 phase는 ROUND_START', () => {
    expect(state.phase).toBe(BattlePhase.ROUND_START);
  });

  it('ROUND_START에서 stepBattle → TURN_START', () => {
    const next = stepBattle(state).state;
    expect(next.phase).toBe(BattlePhase.TURN_START);
    expect(next.round).toBe(1);
  });

  it('TURN_START에서 stepBattle → TURN_END (executeTurn 실행)', () => {
    let s = advanceTo(state, BattlePhase.TURN_START);
    const next = stepBattle(s).state;
    expect(next.phase).toBe(BattlePhase.TURN_END);
  });

  it('모든 유닛 행동 완료 후 → ROUND_END', () => {
    let s = advanceTo(state, BattlePhase.TURN_START);
    // 모든 유닛 행동 완료까지 반복
    while (!isRoundComplete(s) && !s.isFinished) {
      s = stepBattle(s).state;
    }
    // TURN_END에서 isRoundComplete이면 다음 stepBattle이 endRound 호출
    if (s.phase === BattlePhase.TURN_END) {
      s = stepBattle(s).state;
    }
    expect([BattlePhase.ROUND_END, BattlePhase.BATTLE_END]).toContain(s.phase);
  });

  it('ROUND_END에서 stepBattle → 다음 라운드 TURN_START', () => {
    // 라운드 1 끝까지 진행
    let s = advanceTo(state, BattlePhase.ROUND_END);
    if (s.isFinished) return; // 전투 끝났으면 스킵

    const prevRound = s.round;
    const next = stepBattle(s).state;
    expect(next.phase).toBe(BattlePhase.TURN_START);
    expect(next.round).toBe(prevRound + 1);
  });
});

// ─── 2. 턴 실행 정합성 ──────────────────────

describe('턴 실행 정합성', () => {
  let state: BattleState;

  beforeEach(() => {
    resetUnitCounter();
    const p1 = makeStarter('Fast', CharacterClass.ARCHER, Team.PLAYER, Position.BACK); // AGI 10
    const p2 = makeStarter('Slow', CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT); // AGI 6
    const e1 = makeStarter('Enemy', CharacterClass.WARRIOR, Team.ENEMY, Position.FRONT);
    state = createBattleState([p1, p2], [e1], [], [], 42);
    state = startRound(state);
  });

  it('doOneStep은 정확히 한 유닛만 행동 완료시킨다', () => {
    const actedBefore = state.units.filter((u) => u.hasActedThisRound).length;
    const { state: next } = doOneStep(state);
    const actedAfter = next.units.filter((u) => u.hasActedThisRound).length;
    expect(actedAfter).toBe(actedBefore + 1);
  });

  it('doOneStep 반복 시 turnOrder 순서대로 행동한다', () => {
    const originalOrder = [...state.turnOrder];
    const executionOrder: string[] = [];
    let s = state;

    for (let i = 0; i < originalOrder.length; i++) {
      const actor = getNextActor(s);
      if (!actor) break;
      executionOrder.push(actor.id);
      const { state: next } = doOneStep(s);
      s = next;
    }

    expect(executionOrder).toEqual(originalOrder);
  });

  it('getNextActor는 turnOrder 캐시를 따른다 (재계산 아님)', () => {
    const order = [...state.turnOrder];
    // 첫 유닛 HP를 1로 만들어 tiebreak 조건 변경
    const modified: BattleState = {
      ...state,
      units: state.units.map((u) => (u.id === order[0] ? { ...u, stats: { ...u.stats, hp: 1 } } : u)),
    };
    const actor = getNextActor(modified);
    expect(actor!.id).toBe(order[0]);
  });
});

// ─── 3. 이벤트 구조 ─────────────────────────

describe('이벤트 데이터 구조', () => {
  let events: BattleEvent[];

  beforeEach(() => {
    resetUnitCounter();
    const p1 = makeStarter('A', CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
    const e1 = makeStarter('E', CharacterClass.WARRIOR, Team.ENEMY, Position.FRONT);
    let state = createBattleState([p1], [e1], [], [], 42);

    // 라운드 시작 + 첫 유닛 행동까지 진행
    state = advanceTo(state, BattlePhase.TURN_START);
    const result = doOneStep(state);
    events = result.newEvents;
  });

  it('ACTION_EXECUTED 이벤트에 sourceId와 data.actionName이 있다', () => {
    const actionEvent = events.find((e) => e.type === 'ACTION_EXECUTED');
    if (actionEvent) {
      expect(actionEvent.sourceId).toBeDefined();
      expect(actionEvent.data?.actionName).toBeDefined();
      expect(typeof actionEvent.data?.actionName).toBe('string');
    }
  });

  it('DAMAGE_DEALT 이벤트에 value(데미지량)가 있다 (data.damage 아님)', () => {
    const dmgEvent = events.find((e) => e.type === 'DAMAGE_DEALT');
    if (dmgEvent) {
      expect(dmgEvent.value).toBeDefined();
      expect(typeof dmgEvent.value).toBe('number');
      // data.damage는 존재하지 않음 — Scene에서 ev.value를 써야 함
      expect(dmgEvent.data?.damage).toBeUndefined();
    }
  });

  it('ROUND_START 이벤트에 data.turnOrder가 있다', () => {
    // events에는 TURN_START부터 있으므로, 별도로 라운드 시작 이벤트 확인
    resetUnitCounter();
    const p1 = makeStarter('A', CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
    const e1 = makeStarter('E', CharacterClass.WARRIOR, Team.ENEMY, Position.FRONT);
    let state = createBattleState([p1], [e1], [], [], 42);
    state = stepBattle(state).state; // ROUND_START → startRound

    const roundStart = state.events.find((e) => e.type === 'ROUND_START');
    expect(roundStart).toBeDefined();
    expect(roundStart!.round).toBe(1);
    expect(Array.isArray(roundStart!.data?.turnOrder)).toBe(true);
  });

  it('TURN_START 이벤트에 sourceId(행동 유닛)와 data.unitName이 있다', () => {
    const turnStart = events.find((e) => e.type === 'TURN_START');
    expect(turnStart).toBeDefined();
    expect(turnStart!.sourceId).toBeDefined();
    expect(typeof turnStart!.data?.unitName).toBe('string');
  });
});

// ─── 4. 스타터 캐릭터 기능 검증 ─────────────────

describe('스타터 캐릭터 편성 검증', () => {
  beforeEach(() => {
    resetUnitCounter();
  });

  it('Archer(BACK)는 공격 카드를 1개 이상 가진다', () => {
    const def = createCharacterDef('Lyra', CharacterClass.ARCHER);
    const backAttacks = def.baseActionSlots.filter(
      (slot) => slot.condition?.type === 'POSITION_BACK' && slot.action.effects.some((e) => e.type === 'DAMAGE'),
    );
    expect(backAttacks.length).toBeGreaterThanOrEqual(1);
  });

  it('Warrior(FRONT)는 공격 카드를 1개 이상 가진다', () => {
    const def = createCharacterDef('Aldric', CharacterClass.WARRIOR);
    const frontAttacks = def.baseActionSlots.filter(
      (slot) => slot.condition?.type === 'POSITION_FRONT' && slot.action.effects.some((e) => e.type === 'DAMAGE'),
    );
    expect(frontAttacks.length).toBeGreaterThanOrEqual(1);
  });

  it('Guardian은 방어 카드를 1개 이상 가진다', () => {
    const def = createCharacterDef('Theron', CharacterClass.GUARDIAN);
    const shields = def.baseActionSlots.filter((slot) => slot.action.effects.some((e) => e.type === 'SHIELD'));
    expect(shields.length).toBeGreaterThanOrEqual(1);
  });

  it('스타터 편성으로 전투가 1라운드 이상 정상 진행된다', () => {
    const aldric = makeStarter('Aldric', CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
    const theron = makeStarter('Theron', CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    const lyra = makeStarter('Lyra', CharacterClass.ARCHER, Team.PLAYER, Position.BACK);

    const encounter = generateEncounter(1, 42);
    const enemies = encounter.map((e) => createUnit(e.definition, Team.ENEMY, e.position));

    let state = createBattleState([aldric, theron, lyra], enemies, [], [], 42);

    // 3라운드 진행 시도
    let rounds = 0;
    for (let step = 0; step < 100 && !state.isFinished; step++) {
      const prevRound = state.round;
      state = stepBattle(state).state;
      if (state.round > prevRound) rounds++;
    }

    expect(rounds).toBeGreaterThanOrEqual(1);
    // 이벤트에 ACTION_EXECUTED가 1개 이상 (누군가 행동함)
    const actions = state.events.filter((e) => e.type === 'ACTION_EXECUTED');
    expect(actions.length).toBeGreaterThanOrEqual(1);
  });

  it('각 스타터가 자신의 포지션에서 행동 가능한 카드를 가진다', () => {
    const configs: [string, string, Position][] = [
      ['Aldric', CharacterClass.WARRIOR, Position.FRONT],
      ['Lyra', CharacterClass.ARCHER, Position.BACK],
      ['Theron', CharacterClass.GUARDIAN, Position.FRONT],
      ['Zara', CharacterClass.CONTROLLER, Position.BACK],
    ];

    for (const [name, cls, defaultPos] of configs) {
      const def = createCharacterDef(name, cls);
      // 기본 포지션에서 조건 충족하는 슬롯이 1개 이상
      const posCondition = defaultPos === Position.FRONT ? 'POSITION_FRONT' : 'POSITION_BACK';
      const usableSlots = def.baseActionSlots.filter(
        (slot) => slot.condition?.type === posCondition || slot.condition?.type === 'ALWAYS',
      );
      expect(usableSlots.length, `${name}(${cls}) at ${defaultPos} has no usable action`).toBeGreaterThanOrEqual(1);
    }
  });
});
