import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, queueIntervention } from '../core/BattleEngine';
import {
  executeQueuedAbility,
  canIntervene,
  executeIntervention,
  heroEditAction,
} from '../systems/HeroInterventionSystem';
import { getHeroDefinition, HERO_DEFINITIONS, COMMON_EDIT_ACTION } from '../data/HeroDefinitions';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, HeroType, AbilityCategory, AbilityType, Target, BuffType } from '../types';
import type { HeroAbility, BattleState, QueuedEditData } from '../types';

describe('HeroDefinitions', () => {
  it('모든 영웅 유형에 대해 정의가 존재한다', () => {
    expect(getHeroDefinition(HeroType.COMMANDER)).toBeDefined();
    expect(getHeroDefinition(HeroType.MAGE)).toBeDefined();
    expect(getHeroDefinition(HeroType.SUPPORT)).toBeDefined();
  });

  it('모든 영웅 정의에 공통 EDIT_ACTION 능력이 포함된다', () => {
    for (const def of Object.values(HERO_DEFINITIONS)) {
      const editAbility = def.abilities.find((a) => a.abilityType === AbilityType.EDIT_ACTION);
      expect(editAbility).toBeDefined();
      expect(editAbility!.category).toBe(AbilityCategory.COMMON);
      expect(editAbility!.id).toBe('common_edit_action');
    }
  });

  it('각 영웅에 UNIQUE 능력이 1개 이상 존재한다', () => {
    for (const def of Object.values(HERO_DEFINITIONS)) {
      const uniques = def.abilities.filter((a) => a.category === AbilityCategory.UNIQUE);
      expect(uniques.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('COMMON_EDIT_ACTION의 effects는 비어 있다 (실행 시 editData 사용)', () => {
    expect(COMMON_EDIT_ACTION.effects).toHaveLength(0);
    expect(COMMON_EDIT_ACTION.abilityType).toBe(AbilityType.EDIT_ACTION);
  });
});

describe('createBattleState abilities 채우기', () => {
  beforeEach(() => resetUnitCounter());

  function makeState(heroType?: (typeof HeroType)[keyof typeof HeroType]) {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    return createBattleState([p1], [e1], undefined, heroType);
  }

  it('COMMANDER로 생성 시 abilities가 채워진다', () => {
    const state = makeState(HeroType.COMMANDER);
    expect(state.hero.abilities.length).toBeGreaterThan(0);
    expect(state.hero.abilities[0].id).toBe('common_edit_action');
  });

  it('MAGE로 생성 시 MAGE 능력이 채워진다', () => {
    const state = makeState(HeroType.MAGE);
    const fireball = state.hero.abilities.find((a) => a.id === 'mage_fireball');
    expect(fireball).toBeDefined();
  });

  it('SUPPORT로 생성 시 SUPPORT 능력이 채워진다', () => {
    const state = makeState(HeroType.SUPPORT);
    const heal = state.hero.abilities.find((a) => a.id === 'support_heal');
    expect(heal).toBeDefined();
  });
});

describe('executeQueuedAbility 분기', () => {
  beforeEach(() => resetUnitCounter());

  function setup() {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    return createBattleState([p1, p2], [e1]);
  }

  it('queuedAbility가 없으면 no-op', () => {
    const state = setup();
    const { state: newState, events } = executeQueuedAbility(state);
    expect(events).toHaveLength(0);
    expect(newState).toBe(state);
  });

  it('EFFECT 타입 능력은 executeIntervention으로 위임된다', () => {
    let state = setup();
    state = { ...state, round: 1, turn: 1 };

    const shieldAbility: HeroAbility = {
      id: 'test_shield',
      name: 'Shield',
      description: 'test',
      effects: [{ type: 'SHIELD', value: 25, target: Target.SELF }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    state = {
      ...state,
      hero: {
        ...state.hero,
        queuedAbility: shieldAbility,
        queuedTargetId: ally.id,
      },
    };

    const { state: newState, events } = executeQueuedAbility(state);
    expect(events.some((e) => e.type === 'HERO_INTERVENTION')).toBe(true);
    expect(newState.hero.interventionsRemaining).toBe(state.hero.interventionsRemaining - 1);
  });

  it('EDIT_ACTION 타입 능력은 heroEditAction으로 위임된다', () => {
    let state = setup();
    state = { ...state, round: 1, turn: 1 };

    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    const editData: QueuedEditData = {
      targetUnitId: ally.id,
      slotIndex: 0,
      newAction: {
        id: 'test_advance',
        name: 'Advance',
        description: 'Move forward.',
        effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
      },
      newCondition: { type: 'ALWAYS' },
    };

    state = {
      ...state,
      hero: {
        ...state.hero,
        queuedAbility: COMMON_EDIT_ACTION,
        queuedEditData: editData,
      },
    };

    const { state: newState, events } = executeQueuedAbility(state);
    expect(events.some((e) => e.type === 'ACTION_EDITED')).toBe(true);
    expect(newState.hero.interventionsRemaining).toBe(state.hero.interventionsRemaining - 1);

    const updatedUnit = newState.units.find((u) => u.id === ally.id)!;
    expect(updatedUnit.actionSlots[0].action.id).toBe('test_advance');
  });
});

describe('새 효과 핸들러 (BUFF, DEBUFF, HEAL, DELAY_TURN, ADVANCE_TURN)', () => {
  beforeEach(() => resetUnitCounter());

  function setup() {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E-Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    let state = createBattleState([p1], [e1]);
    return { ...state, round: 1, turn: 1 };
  }

  it('BUFF 효과: 아군에게 버프를 부여한다', () => {
    const state = setup();
    const ability: HeroAbility = {
      id: 'test_buff',
      name: 'Rally',
      description: 'test',
      effects: [{ type: 'BUFF', buffType: BuffType.ATK_UP, value: 3, duration: 2, target: Target.ALLY_LOWEST_HP }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    const { state: newState, events } = executeIntervention(state, ability, ally.id);

    const updatedAlly = newState.units.find((u) => u.id === ally.id)!;
    expect(updatedAlly.buffs.some((b) => b.type === BuffType.ATK_UP)).toBe(true);
    expect(events.some((e) => e.type === 'BUFF_APPLIED')).toBe(true);
  });

  it('DEBUFF 효과: 적에게 디버프를 부여한다', () => {
    const state = setup();
    const ability: HeroAbility = {
      id: 'test_debuff',
      name: 'Weaken',
      description: 'test',
      effects: [{ type: 'DEBUFF', buffType: BuffType.ATK_DOWN, value: 3, duration: 2, target: Target.ENEMY_ANY }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    const enemy = state.units.find((u) => u.team === Team.ENEMY)!;
    const { state: newState, events } = executeIntervention(state, ability, enemy.id);

    const updatedEnemy = newState.units.find((u) => u.id === enemy.id)!;
    expect(updatedEnemy.buffs.some((b) => b.type === BuffType.ATK_DOWN)).toBe(true);
    expect(events.some((e) => e.type === 'DEBUFF_APPLIED')).toBe(true);
  });

  it('HEAL 효과: 아군을 회복한다', () => {
    const state = setup();
    // HP를 깎아둔 상태에서 힐
    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    const damagedState = {
      ...state,
      units: state.units.map((u) => (u.id === ally.id ? { ...u, stats: { ...u.stats, hp: u.stats.maxHp - 10 } } : u)),
    };

    const ability: HeroAbility = {
      id: 'test_heal',
      name: 'Heal',
      description: 'test',
      effects: [{ type: 'HEAL', value: 15, target: Target.ALLY_LOWEST_HP }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    const { state: newState, events } = executeIntervention(damagedState, ability, ally.id);

    const updatedAlly = newState.units.find((u) => u.id === ally.id)!;
    expect(updatedAlly.stats.hp).toBeGreaterThan(ally.stats.maxHp - 10);
    expect(events.some((e) => e.type === 'HEAL_APPLIED')).toBe(true);
  });

  it('HEAL은 maxHp를 초과하지 않는다', () => {
    const state = setup();
    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    // HP가 이미 만땅인 상태
    const ability: HeroAbility = {
      id: 'test_heal',
      name: 'Heal',
      description: 'test',
      effects: [{ type: 'HEAL', value: 100, target: Target.ALLY_LOWEST_HP }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    const { state: newState } = executeIntervention(state, ability, ally.id);
    const updatedAlly = newState.units.find((u) => u.id === ally.id)!;
    expect(updatedAlly.stats.hp).toBe(ally.stats.maxHp);
  });

  it('DELAY_TURN 효과: 턴 순서를 뒤로 민다', () => {
    const state = setup();
    const enemy = state.units.find((u) => u.team === Team.ENEMY)!;

    const ability: HeroAbility = {
      id: 'test_delay',
      name: 'Delay',
      description: 'test',
      effects: [{ type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    // turnOrder에 enemy가 있는 상태에서 테스트
    const stateWithOrder = {
      ...state,
      turnOrder: [enemy.id, state.units.find((u) => u.team === Team.PLAYER)!.id],
    };

    const { state: newState } = executeIntervention(stateWithOrder, ability, enemy.id);
    // 적이 뒤로 밀렸는지 확인
    const enemyIdx = newState.turnOrder.indexOf(enemy.id);
    expect(enemyIdx).toBeGreaterThan(0);
  });

  it('ADVANCE_TURN 효과: 턴 순서를 앞으로 당긴다', () => {
    const state = setup();
    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    const enemy = state.units.find((u) => u.team === Team.ENEMY)!;

    const ability: HeroAbility = {
      id: 'test_advance',
      name: 'Haste',
      description: 'test',
      effects: [{ type: 'ADVANCE_TURN', value: 1, target: Target.ALLY_LOWEST_HP }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    const stateWithOrder = {
      ...state,
      turnOrder: [enemy.id, ally.id],
    };

    const { state: newState } = executeIntervention(stateWithOrder, ability, ally.id);
    // 아군이 앞으로 당겨졌는지 확인
    expect(newState.turnOrder[0]).toBe(ally.id);
  });
});

describe('큐잉→발동 end-to-end', () => {
  beforeEach(() => resetUnitCounter());

  function setup() {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E-Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const e2 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    return createBattleState([p1, p2], [e1, e2]);
  }

  it('BUFF 능력을 큐잉 후 stepBattle에서 정상 발동된다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    const buffAbility: HeroAbility = {
      id: 'commander_rally',
      name: 'Rally',
      description: 'ATK buff',
      effects: [{ type: 'BUFF', buffType: BuffType.ATK_UP, value: 3, duration: 2, target: Target.ALLY_LOWEST_HP }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    state = queueIntervention(state, buffAbility, ally.id);

    const eventsBefore = state.events.length;
    state = stepBattle(state).state; // 턴 실행 → 개입 발동

    const heroEvents = state.events.slice(eventsBefore).filter((e) => e.type === 'HERO_INTERVENTION');
    expect(heroEvents.length).toBe(1);

    const updatedAlly = state.units.find((u) => u.id === ally.id)!;
    expect(updatedAlly.buffs.some((b) => b.type === BuffType.ATK_UP)).toBe(true);
  });

  it('EDIT_ACTION 능력을 큐잉 후 stepBattle에서 정상 발동된다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    const ally = state.units.find((u) => u.team === Team.PLAYER)!;
    const editData: QueuedEditData = {
      targetUnitId: ally.id,
      slotIndex: 2,
      newAction: {
        id: 'replacement_action',
        name: 'New Move',
        description: 'test',
        effects: [{ type: 'MOVE', target: Target.SELF, position: 'BACK' }],
      },
      newCondition: { type: 'ALWAYS' },
    };

    state = queueIntervention(state, COMMON_EDIT_ACTION, undefined, editData);

    expect(state.hero.queuedAbility).toBeDefined();
    expect(state.hero.queuedEditData).toBeDefined();

    const eventsBefore = state.events.length;
    state = stepBattle(state).state; // 턴 실행 → 개입 발동

    const editEvents = state.events.slice(eventsBefore).filter((e) => e.type === 'ACTION_EDITED');
    expect(editEvents.length).toBe(1);

    const updatedAlly = state.units.find((u) => u.id === ally.id)!;
    expect(updatedAlly.actionSlots[2].action.id).toBe('replacement_action');

    // 큐 클리어 확인
    expect(state.hero.queuedAbility).toBeUndefined();
    expect(state.hero.queuedEditData).toBeUndefined();
  });
});
