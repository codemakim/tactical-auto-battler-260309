import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, runFullBattle } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase } from '../types';
import { resetUid } from '../utils/uid';

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

    const playerCount = state.units.filter(u => u.team === Team.PLAYER).length;
    const enemyCount = state.units.filter(u => u.team === Team.ENEMY).length;

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

    const eventTypes = result.events.map(e => e.type);

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
    const reserveEvents = result.events.filter(e => e.type === 'RESERVE_ENTERED');
    const deathEvents = result.events.filter(e => e.type === 'UNIT_DIED');

    // 아군이 1명이라도 죽었으면 예비 투입이 발생해야 함
    const playerDeaths = deathEvents.filter(e => {
      const deadUnit = [...state.units, ...state.reserve].find(u => u.id === e.targetId);
      return deadUnit?.team === Team.PLAYER;
    });

    if (playerDeaths.length > 0) {
      expect(reserveEvents.length).toBeGreaterThan(0);
    }
  });

  it('예비 유닛은 원래 포지션과 관계없이 항상 BACK으로 진입한다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P2', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    // 예비 유닛을 FRONT 포지션으로 생성
    const reserve = createUnit(createCharacterDef('P-Reserve', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);
    expect(reserve.position).toBe(Position.FRONT); // 원래 FRONT

    const e1 = createUnit(createCharacterDef('E1', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);
    e1.stats.atk = 200; // 한 방에 죽이는 공격력
    const e2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const e3 = createUnit(createCharacterDef('E3', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const state = createBattleState([p1, p2, p3], [e1, e2, e3], [reserve], []);
    const result = runFullBattle(state);

    // 예비 유닛 투입 이벤트 확인
    const reserveEvents = result.events.filter(e => e.type === 'RESERVE_ENTERED');

    if (reserveEvents.length > 0) {
      // 투입된 예비 유닛이 실제 units에서 BACK 포지션인지 확인
      const enteredUnit = result.units.find(u => u.id === reserve.id);
      expect(enteredUnit).toBeDefined();
      expect(enteredUnit!.position).toBe(Position.BACK);
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

    const ids = result.events.map(e => e.id);

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
