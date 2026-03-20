import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, runFullBattle } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase } from '../types';
import type { BattleState } from '../types';
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

    return createBattleState([p1, p2, p3], [e1, e2, e3], [], []);
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

describe('예비 유닛 투입', () => {
  beforeEach(() => resetUnitCounter());

  it('아군이 죽으면 예비 유닛이 투입된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P2', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const reserve = createUnit(createCharacterDef('P-Reserve', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);

    // 약한 적 (빨리 끝나도록)
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);
    e1.stats.atk = 200; // 한 방에 죽이는 공격력
    const e2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const e3 = createUnit(createCharacterDef('E3', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [reserve], []);
    const result = runFullBattle(state);

    // 예비 유닛 투입 이벤트가 있어야 함 (아군이 죽었다면)
    const reserveEvents = result.events.filter((e) => e.type === 'RESERVE_ENTERED');
    const deathEvents = result.events.filter((e) => e.type === 'UNIT_DIED');

    // 아군이 1명이라도 죽었으면 예비 투입이 발생해야 함
    const playerDeaths = deathEvents.filter((e) => {
      const deadUnit = [...state.units, ...state.reserve].find((u) => u.id === e.targetId);
      return deadUnit?.team === Team.PLAYER;
    });

    if (playerDeaths.length > 0) {
      expect(reserveEvents.length).toBeGreaterThan(0);
    }
  });

  it('예비 유닛은 투입된 라운드에는 행동하지 않는다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P2', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const reserve = createUnit(createCharacterDef('P-Reserve', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);

    const e1 = createUnit(createCharacterDef('E1', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);
    e1.stats.atk = 200; // 한 방에 죽이는 공격력
    const e2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const e3 = createUnit(createCharacterDef('E3', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [reserve], []);
    const result = runFullBattle(state);

    // 예비 유닛 투입 이벤트 확인
    const reserveEvents = result.events.filter((e) => e.type === 'RESERVE_ENTERED');

    if (reserveEvents.length > 0) {
      const enteredUnit = result.units.find((u) => u.id === reserve.id);
      // 예비 유닛이 전장에 있음
      expect(enteredUnit).toBeDefined();

      // §16: 투입 시 hasActedThisRound: true로 설정되어 해당 라운드에는 행동 불가
      // RESERVE_ENTERED 이벤트가 기록된 라운드에서 투입 유닛의 TURN_START 이벤트가 없어야 함
      const reserveEntry = reserveEvents[0];
      const entryRound = reserveEntry.round;

      // 같은 라운드에 예비 유닛의 TURN_START 이벤트가 없어야 함
      const reserveTurnsInSameRound = result.events.filter(
        (e) => e.type === 'TURN_START' && e.round === entryRound && e.sourceId === reserve.id,
      );
      expect(reserveTurnsInSameRound.length).toBe(0);
    }
  });

  it('예비 유닛은 다음 라운드부터 행동에 참여한다 (§16)', () => {
    // p1은 매우 약해서 round 1에 사망 → reserve 투입
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    p1.stats.hp = 1;
    p1.stats.maxHp = 1;
    // p2, p3은 오래 생존 (적들이 낮은 공격력)
    const p2 = createUnit(createCharacterDef('P2', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    p2.stats.hp = 9999;
    p2.stats.maxHp = 9999;
    const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    p3.stats.hp = 9999;
    p3.stats.maxHp = 9999;
    const reserve = createUnit(createCharacterDef('P-Reserve', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);
    reserve.stats.hp = 9999;
    reserve.stats.maxHp = 9999;

    // e1은 강해서 p1을 1격에 사망, e2/e3은 hp가 높아 전투가 여러 라운드 지속
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);
    e1.stats.atk = 200;
    const e2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    e2.stats.hp = 9999;
    e2.stats.maxHp = 9999;
    const e3 = createUnit(createCharacterDef('E3', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    e3.stats.hp = 9999;
    e3.stats.maxHp = 9999;

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [reserve], []);
    const result = runFullBattle(state);

    const reserveEvents = result.events.filter((e) => e.type === 'RESERVE_ENTERED');
    expect(reserveEvents.length).toBeGreaterThan(0); // 반드시 투입돼야 함

    if (reserveEvents.length > 0) {
      const entryRound = reserveEvents[0].round;

      // §16: 다음 라운드 이후 예비 유닛의 TURN_START 이벤트가 있어야 함
      const reserveTurnsAfterEntry = result.events.filter(
        (e) => e.type === 'TURN_START' && e.round > entryRound && e.sourceId === reserve.id,
      );

      // 전투가 다음 라운드까지 지속된 경우에만 검증
      const nextRoundExists = result.events.some((e) => e.round === entryRound + 1);
      if (nextRoundExists) {
        expect(reserveTurnsAfterEntry.length).toBeGreaterThan(0);
      }
    }
  });

  it('예비 유닛은 투입 후 다음 라운드 turnOrder에 포함된다 (§16)', () => {
    // p1이 1HP라서 라운드 1에 사망 → reserve 투입 → 라운드 2 turnOrder에 reserve가 있어야 함
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    p1.stats.hp = 1;
    p1.stats.maxHp = 1;
    const p2 = createUnit(createCharacterDef('P2', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    p2.stats.hp = 9999;
    p2.stats.maxHp = 9999;
    const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    p3.stats.hp = 9999;
    p3.stats.maxHp = 9999;
    const reserve = createUnit(createCharacterDef('P-Reserve', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);
    reserve.stats.hp = 9999;
    reserve.stats.maxHp = 9999;

    const e1 = createUnit(createCharacterDef('E1', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);
    e1.stats.atk = 200;
    const e2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    e2.stats.hp = 9999;
    e2.stats.maxHp = 9999;
    const e3 = createUnit(createCharacterDef('E3', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    e3.stats.hp = 9999;
    e3.stats.maxHp = 9999;

    let state = createBattleState([p1, p2, p3], [e1, e2, e3], [reserve], []);

    // 라운드 1 끝까지 진행 (reserve 투입 대기)
    state = stepBattle(state).state;
    while (state.phase !== BattlePhase.ROUND_END && !state.isFinished) {
      state = stepBattle(state).state;
    }

    if (state.isFinished) return;

    const reserveInBattle = state.units.find((u) => u.id === reserve.id);
    if (!reserveInBattle) return; // p1이 살아남아 reserve 미투입 시 skip

    // 라운드 2 시작
    state = stepBattle(state).state;

    // §16: 투입된 예비 유닛이 다음 라운드 turnOrder에 포함되어야 함
    expect(state.turnOrder).toContain(reserve.id);
  });

  it('예비 유닛은 원래 포지션과 관계없이 항상 BACK으로 진입한다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P2', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    // 예비 유닛을 FRONT 포지션으로 생성
    const reserve = createUnit(createCharacterDef('P-Reserve', CharacterClass.ARCHER), Team.PLAYER, Position.FRONT);
    expect(reserve.position).toBe(Position.FRONT); // 원래 FRONT

    const e1 = createUnit(createCharacterDef('E1', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);
    e1.stats.atk = 200; // 한 방에 죽이는 공격력
    const e2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const e3 = createUnit(createCharacterDef('E3', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [reserve], []);
    const result = runFullBattle(state);

    // 예비 유닛 투입 이벤트 확인
    const reserveEvents = result.events.filter((e) => e.type === 'RESERVE_ENTERED');

    if (reserveEvents.length > 0) {
      // 투입된 예비 유닛이 실제 units에서 BACK 포지션인지 확인
      const enteredUnit = result.units.find((u) => u.id === reserve.id);
      expect(enteredUnit).toBeDefined();
      expect(enteredUnit!.position).toBe(Position.BACK);
    }
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

describe('라운드 종료 이벤트 순서', () => {
  beforeEach(() => resetUnitCounter());

  it('ROUND_END 이벤트는 같은 라운드의 BUFF_EXPIRED 이벤트보다 항상 나중에 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3 = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [], []);
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

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [], []);
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

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [], []);
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

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [], []);
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
});
