import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, queueIntervention } from '../core/BattleEngine';
import { canIntervene } from '../systems/HeroInterventionSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, Target, AbilityCategory, AbilityType } from '../types';
import type { HeroAbility } from '../types';

describe('히어로 개입 큐잉 (§18)', () => {
  beforeEach(() => resetUnitCounter());

  function setup() {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const p3 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e2 = createUnit(createCharacterDef('E-Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const e3 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);

    return createBattleState([p1, p2, p3], [e1, e2, e3], [], []);
  }

  const shieldAbility: HeroAbility = {
    id: 'hero_shield',
    name: 'Protect',
    description: 'Shield an ally',
    effects: [{ type: 'SHIELD', value: 30, target: Target.SELF }],
    category: AbilityCategory.UNIQUE,
    abilityType: AbilityType.EFFECT,
  };

  const damageAbility: HeroAbility = {
    id: 'hero_strike',
    name: 'Strike',
    description: 'Damage an enemy',
    effects: [{ type: 'DAMAGE', value: 1, target: Target.ENEMY_ANY }],
    category: AbilityCategory.UNIQUE,
    abilityType: AbilityType.EFFECT,
  };

  // === 큐잉 기본 동작 ===

  it('queueIntervention은 queuedAbility를 HeroState에 저장한다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    state = queueIntervention(state, shieldAbility);

    expect(state.hero.queuedAbility).toBeDefined();
    expect(state.hero.queuedAbility?.id).toBe('hero_shield');
  });

  it('queueIntervention은 targetId도 함께 저장한다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const ally = state.units.find(u => u.team === Team.PLAYER)!;
    state = queueIntervention(state, shieldAbility, ally.id);

    expect(state.hero.queuedTargetId).toBe(ally.id);
  });

  it('큐잉 직후에는 유닛 상태가 변하지 않는다 (즉시 실행 아님)', () => {
    let state = setup();
    state = stepBattle(state).state;

    const ally = state.units.find(u => u.team === Team.PLAYER)!;
    const shieldBefore = ally.shield;

    state = queueIntervention(state, shieldAbility, ally.id);

    const allyAfter = state.units.find(u => u.id === ally.id)!;
    expect(allyAfter.shield).toBe(shieldBefore); // 즉시 적용 안 됨
  });

  it('큐잉 시 개입 횟수가 아직 차감되지 않는다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const remainingBefore = state.hero.interventionsRemaining;
    state = queueIntervention(state, shieldAbility);

    expect(state.hero.interventionsRemaining).toBe(remainingBefore);
  });

  it('개입 횟수가 0이면 큐잉이 거부된다', () => {
    let state = setup();
    state = stepBattle(state).state;

    // 개입 횟수를 0으로 강제 설정
    state = { ...state, hero: { ...state.hero, interventionsRemaining: 0 } };

    state = queueIntervention(state, shieldAbility);

    expect(state.hero.queuedAbility).toBeUndefined();
  });

  // === 큐 실행 타이밍 ===

  it('executeTurn 호출 시 큐잉된 개입이 유닛 행동 직전에 실행된다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    const ally = state.units.find(u => u.team === Team.PLAYER)!;
    state = queueIntervention(state, shieldAbility, ally.id);

    // 다음 턴 실행
    state = stepBattle(state).state;

    // 개입이 실행되어 실드가 적용되어 있어야 함
    const allyAfter = state.units.find(u => u.id === ally.id)!;
    expect(allyAfter.shield).toBeGreaterThan(0);
  });

  it('executeTurn 후 queuedAbility가 초기화된다', () => {
    let state = setup();
    state = stepBattle(state).state;

    state = queueIntervention(state, shieldAbility);
    state = stepBattle(state).state; // 턴 실행 → 큐 소비

    expect(state.hero.queuedAbility).toBeUndefined();
    expect(state.hero.queuedTargetId).toBeUndefined();
  });

  it('executeTurn 후 개입 횟수가 차감된다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const remainingBefore = state.hero.interventionsRemaining;
    state = queueIntervention(state, shieldAbility);
    state = stepBattle(state).state;

    expect(state.hero.interventionsRemaining).toBe(remainingBefore - 1);
  });

  it('큐잉된 개입은 이벤트 로그에 HERO_INTERVENTION으로 기록된다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const eventsCountBefore = state.events.length;
    state = queueIntervention(state, shieldAbility);
    state = stepBattle(state).state;

    const interventionEvents = state.events
      .slice(eventsCountBefore)
      .filter(e => e.type === 'HERO_INTERVENTION');

    expect(interventionEvents.length).toBe(1);
  });

  it('HERO_INTERVENTION 이벤트는 같은 턴의 ACTION_EXECUTED보다 먼저 기록된다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    state = queueIntervention(state, shieldAbility);
    const eventsBefore = state.events.length;
    state = stepBattle(state).state;

    const newEvents = state.events.slice(eventsBefore);
    const interventionIdx = newEvents.findIndex(e => e.type === 'HERO_INTERVENTION');
    const actionIdx = newEvents.findIndex(e => e.type === 'ACTION_EXECUTED');

    expect(interventionIdx).toBeGreaterThanOrEqual(0); // HERO_INTERVENTION 존재
    if (actionIdx >= 0) {
      expect(interventionIdx).toBeLessThan(actionIdx); // 유닛 행동보다 먼저
    }
  });

  it('큐잉된 개입(데미지)은 유닛 행동보다 먼저 적에게 적용된다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const enemy = state.units
      .filter(u => u.team === Team.ENEMY && u.isAlive)
      .sort((a, b) => a.stats.hp - b.stats.hp)[0]!;
    const hpBefore = enemy.stats.hp;

    state = queueIntervention(state, damageAbility);
    state = stepBattle(state).state;

    const enemyAfter = state.units.find(u => u.id === enemy.id)!;
    // 히어로 데미지가 적용되거나, 사망해서 isAlive가 false인 경우
    expect(enemyAfter.stats.hp < hpBefore || !enemyAfter.isAlive).toBe(true);
  });

  // === 큐 없을 때는 정상 동작 ===

  it('큐잉된 개입이 없으면 executeTurn이 기존처럼 동작한다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const turnBefore = state.turn;
    state = stepBattle(state).state;

    expect(state.turn).toBeGreaterThan(turnBefore);
    expect(state.hero.queuedAbility).toBeUndefined();
  });
});
