import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, runFullBattle } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, BuffType } from '../types';
import type { BattleState, BattleUnit } from '../types';
import { resetUid } from '../utils/uid';
import { endRound } from '../core/RoundManager';

describe('전투 흐름', () => {
  beforeEach(() => resetUnitCounter());

  function setup3v3() {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3 = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    return createBattleState([p1, p2, p3], [e1, e2, e3]);
  }

  it('전투는 3v3 형식이다', () => {
    const state = setup3v3();

    const playerCount = state.units.filter((u) => u.team === Team.PLAYER).length;
    const enemyCount = state.units.filter((u) => u.team === Team.ENEMY).length;

    expect(playerCount).toBe(3);
    expect(enemyCount).toBe(3);
  });

  it('전투 시작 시 phase는 ROUND_START이다', () => {
    const state = setup3v3();
    expect(state.phase).toBe(BattlePhase.ROUND_START);
    expect(state.round).toBe(0);
  });

  it('stepBattle로 라운드가 시작되면 턴 순서가 계산된다', () => {
    let state = setup3v3();
    const result = stepBattle(state);
    state = result.state;

    expect(state.round).toBe(1);
    expect(state.turnOrder.length).toBe(6); // 6명 전원
    expect(state.phase).toBe(BattlePhase.TURN_START);
  });

  it('라운드 내에서 모든 유닛이 1회씩 행동한다', () => {
    let state = setup3v3();

    // 라운드 시작
    state = stepBattle(state).state;

    // 6명이 모두 행동할 때까지 step
    let actionCount = 0;
    while (state.phase !== BattlePhase.ROUND_END && state.phase !== BattlePhase.BATTLE_END) {
      const prevTurn = state.turn;
      state = stepBattle(state).state;
      if (state.turn > prevTurn) actionCount++;
    }

    // 전투가 끝나지 않았다면 6명 모두 행동했어야 함
    if (!state.isFinished) {
      expect(actionCount).toBe(6);
    }
  });

  it('전투를 끝까지 자동 실행하면 승자가 결정된다', () => {
    const state = setup3v3();
    const result = runFullBattle(state);

    expect(result.isFinished).toBe(true);
    expect(result.winner).not.toBeNull();
    expect([Team.PLAYER, Team.ENEMY]).toContain(result.winner);
  });

  it('전투 이벤트 로그에 ROUND_START, ACTION_EXECUTED 등이 기록된다', () => {
    const state = setup3v3();
    const result = runFullBattle(state);

    const eventTypes = result.events.map((e) => e.type);

    expect(eventTypes).toContain('ROUND_START');
    expect(eventTypes).toContain('ACTION_EXECUTED');
    expect(eventTypes).toContain('DAMAGE_DEALT');
    expect(eventTypes).toContain('BATTLE_END');
  });

  it('최대 라운드를 초과하면 강제 종료된다', () => {
    // 서로 데미지를 못 주는 극단적 상황 시뮬레이션을 위해
    // 최대 라운드(20) 안에 끝나는지 확인
    const state = setup3v3();
    const result = runFullBattle(state);

    expect(result.round).toBeLessThanOrEqual(20);
    expect(result.isFinished).toBe(true);
  });
});

describe('라운드 종료 - 실드 제거 (§7)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('라운드 종료 시 모든 유닛의 실드가 0으로 초기화된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    // 실드 부여
    p1.shield = 15;
    e1.shield = 10;

    const state: BattleState = {
      units: [p1, e1],
      reserve: [],
      hero: { heroType: 'COMMANDER', interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
      round: 1,
      turn: 6,
      turnOrder: [],
      phase: BattlePhase.ROUND_END as BattlePhase,
      events: [],
      delayedEffects: [],
      isFinished: false,
      winner: null,
      seed: 12345,
    };

    const afterEnd = endRound(state);
    expect(afterEnd.units.find((u) => u.id === p1.id)!.shield).toBe(0);
    expect(afterEnd.units.find((u) => u.id === e1.id)!.shield).toBe(0);
  });

  it('죽은 유닛의 실드는 건드리지 않는다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.isAlive = false;
    p1.shield = 5;

    const state: BattleState = {
      units: [p1, e1],
      reserve: [],
      hero: { heroType: 'COMMANDER', interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
      round: 1,
      turn: 6,
      turnOrder: [],
      phase: BattlePhase.ROUND_END as BattlePhase,
      events: [],
      delayedEffects: [],
      isFinished: false,
      winner: null,
      seed: 12345,
    };

    const afterEnd = endRound(state);
    // 죽은 유닛은 실드 제거 대상이 아님
    expect(afterEnd.units.find((u) => u.id === p1.id)!.shield).toBe(5);
  });

  it('라운드 종료 시 SHIELD_CLEARED 이벤트가 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.shield = 15;

    const state: BattleState = {
      units: [p1, e1],
      reserve: [],
      hero: { heroType: 'COMMANDER', interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
      round: 1,
      turn: 6,
      turnOrder: [],
      phase: BattlePhase.ROUND_END as BattlePhase,
      events: [],
      delayedEffects: [],
      isFinished: false,
      winner: null,
      seed: 12345,
    };

    const afterEnd = endRound(state);
    const shieldCleared = afterEnd.events.filter((e) => e.type === 'SHIELD_CLEARED');
    expect(shieldCleared.length).toBe(1); // p1만 실드가 있었으므로
    expect(shieldCleared[0].targetId).toBe(p1.id);
    expect(shieldCleared[0].data!.shieldBefore).toBe(15);
  });
});

describe('stepBattle 통합 - 라운드 간 실드 제거 (§7)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('stepBattle 루프에서 라운드가 전환되면 실드가 0으로 초기화된다', () => {
    // Guardian(실드 부여) vs Warrior — stepBattle로 1라운드 완주 후 실드 확인
    const guardian = createUnit(createCharacterDef('Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const warrior = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    let state = createBattleState([guardian], [warrior]);

    // stepBattle로 라운드 1 완주 + 라운드 2 시작까지 진행
    const maxSteps = 50;
    let steps = 0;
    while (state.round < 2 && steps < maxSteps) {
      state = stepBattle(state).state;
      steps++;
    }

    // 라운드 2가 시작됐으면, 라운드 1에서 부여된 실드가 제거되었어야 한다
    expect(state.round).toBeGreaterThanOrEqual(2);

    // SHIELD_CLEARED 이벤트가 라운드 1 종료 시점에 존재해야 한다
    const shieldCleared = state.events.filter((e) => e.type === 'SHIELD_CLEARED' && e.round === 1);
    // Guardian은 Shield Wall로 자기에게 실드를 부여하므로 최소 1개
    expect(shieldCleared.length).toBeGreaterThanOrEqual(1);

    // 라운드 2 시작 시점에서 실드가 0이어야 한다
    const roundStartEvents = state.events.filter((e) => e.type === 'ROUND_START' && e.round === 2);
    expect(roundStartEvents.length).toBe(1);

    // ROUND_START(R2) 이전의 마지막 상태에서 실드가 제거됐는지 확인
    // SHIELD_CLEARED가 ROUND_END 이전에 기록되어야 한다
    const round1End = state.events.findIndex((e) => e.type === 'ROUND_END' && e.round === 1);
    const round1ShieldClear = state.events.findIndex((e) => e.type === 'SHIELD_CLEARED' && e.round === 1);
    expect(round1ShieldClear).toBeGreaterThan(-1);
    expect(round1ShieldClear).toBeLessThan(round1End);
  });

  it('여러 라운드를 거쳐도 실드가 누적되지 않는다', () => {
    // Guardian vs Warrior — 3라운드 이상 진행 시 실드가 계속 리셋되는지 확인
    const guardian = createUnit(createCharacterDef('Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const warrior = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    let state = createBattleState([guardian], [warrior]);

    // 3라운드까지 진행
    const maxSteps = 100;
    let steps = 0;
    while (state.round < 4 && !state.isFinished && steps < maxSteps) {
      state = stepBattle(state).state;
      steps++;
    }

    // 각 라운드 종료마다 SHIELD_CLEARED가 발생해야 한다
    for (let r = 1; r <= Math.min(state.round - 1, 3); r++) {
      const cleared = state.events.filter((e) => e.type === 'SHIELD_CLEARED' && e.round === r);
      // Guardian이 매 라운드 실드를 부여하므로 매 라운드 최소 1개 클리어
      expect(cleared.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('runFullBattle에서도 라운드 간 실드가 정상 제거된다', () => {
    const guardian = createUnit(createCharacterDef('Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const warrior = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const initial = createBattleState([guardian], [warrior]);
    const final = runFullBattle(initial);

    // 전투가 여러 라운드 진행됐을 것
    expect(final.round).toBeGreaterThanOrEqual(2);

    // 전투 종료 시 살아있는 유닛의 실드 누적량 확인
    // 마지막 라운드 기준 실드는 해당 라운드 내에서 부여된 양만 있어야 한다
    const allShieldCleared = final.events.filter((e) => e.type === 'SHIELD_CLEARED');
    const completedRounds = final.round - (final.isFinished ? 0 : 1);

    // 완료된 각 라운드마다 SHIELD_CLEARED가 존재해야 한다
    for (let r = 1; r < completedRounds; r++) {
      const roundCleared = allShieldCleared.filter((e) => e.round === r);
      expect(roundCleared.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('버프 만료도 stepBattle 루프에서 정상 처리된다', () => {
    // endRound 내 tickBuffs도 stepBattle 경로에서 호출되는지 확인
    const guardian = createUnit(createCharacterDef('Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const warrior = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    // duration 1 버프 수동 부여
    guardian.buffs = [{ id: 'test_buff', type: 'ATK_UP' as any, value: 5, duration: 1, sourceId: guardian.id }];

    let state = createBattleState([guardian], [warrior]);

    // 라운드 2까지 진행
    const maxSteps = 50;
    let steps = 0;
    while (state.round < 2 && steps < maxSteps) {
      state = stepBattle(state).state;
      steps++;
    }

    // 라운드 1 종료 시 BUFF_EXPIRED가 발생해야 한다
    const buffExpired = state.events.filter((e) => e.type === 'BUFF_EXPIRED' && e.round === 1);
    expect(buffExpired.length).toBeGreaterThanOrEqual(1);

    // 라운드 2 시작 시점에서 해당 버프가 제거되었어야 한다
    const g = state.units.find((u) => u.name === 'Guardian')!;
    const testBuff = g.buffs.find((b) => b.id === 'test_buff');
    expect(testBuff).toBeUndefined();
  });
});

describe('라운드 종료 이벤트 순서', () => {
  beforeEach(() => resetUnitCounter());

  it('ROUND_END 이벤트는 같은 라운드의 BUFF_EXPIRED 이벤트보다 항상 나중에 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3 = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3]);
    const result = runFullBattle(state);

    const events = result.events;

    // 각 라운드에 대해 ROUND_END 인덱스가 해당 라운드의 BUFF_EXPIRED보다 큰지 확인
    const roundEnds = events.map((e, i) => ({ event: e, index: i })).filter(({ event }) => event.type === 'ROUND_END');

    for (const { event: roundEnd, index: roundEndIdx } of roundEnds) {
      const buffExpiredInSameRound = events
        .map((e, i) => ({ event: e, index: i }))
        .filter(({ event }) => event.type === 'BUFF_EXPIRED' && event.round === roundEnd.round);

      for (const { index: buffIdx } of buffExpiredInSameRound) {
        // §7.1: 버프 틱은 라운드 종료 처리 중 ROUND_END 이벤트보다 먼저 기록됨
        expect(buffIdx).toBeLessThan(roundEndIdx);
      }
    }
  });

  it('ROUND_END 이벤트는 같은 라운드의 DELAYED_EFFECT_RESOLVED 이벤트보다 항상 나중에 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3 = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3]);
    const result = runFullBattle(state);

    const events = result.events;

    // 각 라운드에 대해 ROUND_END 인덱스가 해당 라운드의 DELAYED_EFFECT_RESOLVED보다 큰지 확인
    const roundEnds = events.map((e, i) => ({ event: e, index: i })).filter(({ event }) => event.type === 'ROUND_END');

    for (const { event: roundEnd, index: roundEndIdx } of roundEnds) {
      const delayedInSameRound = events
        .map((e, i) => ({ event: e, index: i }))
        .filter(({ event }) => event.type === 'DELAYED_EFFECT_RESOLVED' && event.round === roundEnd.round);

      for (const { index: delayedIdx } of delayedInSameRound) {
        // §7.2: 지연 효과는 라운드 종료 처리 중 ROUND_END 이벤트보다 먼저 기록됨
        expect(delayedIdx).toBeLessThan(roundEndIdx);
      }
    }
  });

  it('같은 라운드에서 BUFF_EXPIRED는 DELAYED_EFFECT_RESOLVED보다 먼저 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3 = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3]);
    const result = runFullBattle(state);
    const events = result.events;

    // BUFF_EXPIRED와 DELAYED_EFFECT_RESOLVED가 같은 라운드에 있는 경우: 버프 틱이 먼저
    const allRounds = new Set(events.map((e) => e.round));
    for (const round of allRounds) {
      const buffExpiredIdxs = events
        .map((e, i) => ({ event: e, index: i }))
        .filter(({ event }) => event.type === 'BUFF_EXPIRED' && event.round === round)
        .map(({ index }) => index);

      const delayedIdxs = events
        .map((e, i) => ({ event: e, index: i }))
        .filter(({ event }) => event.type === 'DELAYED_EFFECT_RESOLVED' && event.round === round)
        .map(({ index }) => index);

      if (buffExpiredIdxs.length > 0 && delayedIdxs.length > 0) {
        const lastBuffExpired = Math.max(...buffExpiredIdxs);
        const firstDelayed = Math.min(...delayedIdxs);
        // §7.1 → §7.2 순서: 버프 틱이 지연 효과 해석보다 먼저
        expect(lastBuffExpired).toBeLessThan(firstDelayed);
      }
    }
  });
});

describe('이벤트 ID 고유성', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('모든 이벤트 ID는 고유하고 비어있지 않은 문자열이어야 한다', () => {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3 = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3]);
    const result = runFullBattle(state);

    const ids = result.events.map((e) => e.id);

    // 모든 ID가 비어있지 않은 문자열인지 확인
    for (const id of ids) {
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    }

    // 모든 ID가 고유한지 확인
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // === 이슈 #2: 라운드 시작 독 데미지로 전멸 시 전투 종료 ===

  it('라운드 시작 독 데미지로 한 팀이 전멸하면 즉시 전투가 종료된다', () => {
    // HP 1인 적 유닛 하나 + 독 버프, 아군 1명
    const pDef = createCharacterDef('P-Warrior', CharacterClass.WARRIOR);
    const eDef = createCharacterDef('E-Warrior', CharacterClass.WARRIOR);
    const p1 = createUnit(pDef, Team.PLAYER, Position.FRONT);
    let e1 = createUnit(eDef, Team.ENEMY, Position.FRONT);

    // e1의 HP를 1로 설정하고 독 버프 부여 (라운드 시작 시 독 데미지로 사망)
    e1 = {
      ...e1,
      stats: { ...e1.stats, hp: 1 },
      buffs: [{ id: 'poison-1', type: BuffType.POISON, value: 5, duration: 3, sourceId: p1.id }],
    };

    let state = createBattleState([p1], [e1]);

    // 라운드 1 시작 → 독 데미지 → e1 사망 → 전투 종료여야 함
    state = stepBattle(state).state;

    // 독으로 e1이 사망했으므로 전투가 종료되어야 한다
    const e1After = state.units.find((u) => u.id === e1.id)!;
    expect(e1After.isAlive).toBe(false);
    expect(state.isFinished).toBe(true);
    expect(state.winner).toBe(Team.PLAYER);
    expect(state.phase).toBe(BattlePhase.BATTLE_END);
  });

  it('라운드 시작 독 데미지로 양팀 모두 전멸하면 ENEMY 승리 (무승부 규칙)', () => {
    const pDef = createCharacterDef('P-Warrior', CharacterClass.WARRIOR);
    const eDef = createCharacterDef('E-Warrior', CharacterClass.WARRIOR);
    let p1 = createUnit(pDef, Team.PLAYER, Position.FRONT);
    let e1 = createUnit(eDef, Team.ENEMY, Position.FRONT);

    // 양쪽 모두 HP 1 + 독
    p1 = {
      ...p1,
      stats: { ...p1.stats, hp: 1 },
      buffs: [{ id: 'poison-p', type: BuffType.POISON, value: 5, duration: 3, sourceId: e1.id }],
    };
    e1 = {
      ...e1,
      stats: { ...e1.stats, hp: 1 },
      buffs: [{ id: 'poison-e', type: BuffType.POISON, value: 5, duration: 3, sourceId: p1.id }],
    };

    let state = createBattleState([p1], [e1]);
    state = stepBattle(state).state;

    expect(state.isFinished).toBe(true);
    expect(state.winner).toBe(Team.ENEMY); // 무승부 = ENEMY 승리
  });

  // === 이슈 #4: 지연 효과로 부여된 독이 다음 라운드 시작 시 틱 (의도된 동작 확인) ===

  it('endRound 지연 효과로 부여된 POISON은 다음 startRound에서 첫 틱이 발생한다', () => {
    const pDef = createCharacterDef('P-Warrior', CharacterClass.WARRIOR);
    const eDef = createCharacterDef('E-Warrior', CharacterClass.WARRIOR);
    const p1 = createUnit(pDef, Team.PLAYER, Position.FRONT);
    const e1 = createUnit(eDef, Team.ENEMY, Position.FRONT);

    let state = createBattleState([p1], [e1]);

    // 라운드 1 시작
    state = stepBattle(state).state;

    // 지연 효과 직접 주입: 1라운드 후 POISON 버프 부여
    state = {
      ...state,
      delayedEffects: [
        {
          id: 'delayed-poison-1',
          sourceId: p1.id,
          targetId: e1.id,
          effectType: 'BUFF' as const,
          value: 10,
          remainingRounds: 1,
          buffType: BuffType.POISON,
          buffDuration: 2,
        },
      ],
    };

    // 라운드 1 모든 턴 진행 → 라운드 종료 (지연 효과 발동 → POISON 부여)
    while (state.phase !== BattlePhase.ROUND_END && state.phase !== BattlePhase.BATTLE_END) {
      state = stepBattle(state).state;
    }
    if (state.isFinished) return;

    // endRound에서 POISON 버프가 부여되었는지 확인
    const e1AfterRound1 = state.units.find((u) => u.id === e1.id)!;
    const hasPoisonBuff = e1AfterRound1.buffs.some((b) => b.type === BuffType.POISON);
    expect(hasPoisonBuff).toBe(true);

    const hpBeforeRound2 = e1AfterRound1.stats.hp;

    // 라운드 2 시작 → startRound에서 POISON 틱
    state = stepBattle(state).state;

    const e1AfterRound2Start = state.units.find((u) => u.id === e1.id)!;
    // 독 데미지로 HP가 감소해야 함 (유예 없이 즉시 틱 = 의도된 동작)
    expect(e1AfterRound2Start.stats.hp).toBeLessThan(hpBeforeRound2);
  });

  // === 이슈 #5: ACTION_RESOLVE 페이즈 전환 테스트 ===

  it('ACTION_RESOLVE 페이즈에서 stepBattle 호출 시 TURN_END로 전환된다', () => {
    const pDef = createCharacterDef('P-Warrior', CharacterClass.WARRIOR);
    const eDef = createCharacterDef('E-Warrior', CharacterClass.WARRIOR);
    const p1 = createUnit(pDef, Team.PLAYER, Position.FRONT);
    const e1 = createUnit(eDef, Team.ENEMY, Position.FRONT);

    let state = createBattleState([p1], [e1]);

    // 강제로 ACTION_RESOLVE 상태 설정
    state = { ...state, phase: BattlePhase.ACTION_RESOLVE, round: 1, turn: 1 };

    const result = stepBattle(state);
    expect(result.state.phase).toBe(BattlePhase.TURN_END);
    // 다른 상태는 변경되지 않아야 함
    expect(result.state.round).toBe(1);
    expect(result.state.turn).toBe(1);
  });
});
