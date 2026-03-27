import { describe, it, expect, beforeEach } from 'vitest';
// heroIntervene = queueIntervention의 UI용 래퍼. 즉시 실행이 아닌 큐잉 방식 (§18).
// 타이밍·큐잉 세부 동작 테스트는 hero-intervention-queuing.spec.ts 참고.
import { createBattleState, stepBattle, heroIntervene } from '../core/BattleEngine';
import { canIntervene, executeIntervention } from '../systems/HeroInterventionSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, Target, AbilityCategory, AbilityType, BuffType } from '../types';
import type { HeroAbility, BattleUnit, BattleState } from '../types';

describe('히어로 개입 시스템', () => {
  beforeEach(() => resetUnitCounter());

  function setup() {
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2 = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const p3 = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e2 = createUnit(createCharacterDef('E-Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const e3 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);

    return createBattleState([p1, p2, p3], [e1, e2, e3]);
  }

  const shieldAbility: HeroAbility = {
    id: 'hero_shield',
    name: 'Protect',
    description: 'Shield an ally',
    effects: [{ type: 'SHIELD', value: 30, target: Target.SELF }],
    category: AbilityCategory.UNIQUE,
    abilityType: AbilityType.EFFECT,
  };

  const pushAbility: HeroAbility = {
    id: 'hero_push',
    name: 'Force Push',
    description: 'Push enemy back',
    effects: [{ type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' }],
    category: AbilityCategory.UNIQUE,
    abilityType: AbilityType.EFFECT,
  };

  it('라운드당 최소 1회 개입이 가능하다', () => {
    let state = setup();
    // 라운드 시작
    state = stepBattle(state).state;

    expect(canIntervene(state)).toBe(true);
    expect(state.hero.interventionsRemaining).toBe(1);
  });

  it('개입을 큐잉 후 발동하면 남은 횟수가 줄어든다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    // §18: heroIntervene는 큐잉 → 다음 유닛 행동 직전 발동
    state = heroIntervene(state, shieldAbility);
    // 큐잉 직후에는 아직 차감 안 됨
    expect(state.hero.interventionsRemaining).toBe(1);

    // 다음 stepBattle에서 개입 발동 → 횟수 차감
    state = stepBattle(state).state;
    expect(state.hero.interventionsRemaining).toBe(0);
    expect(canIntervene(state)).toBe(false);
  });

  it('개입 횟수를 소진하면 더 이상 개입할 수 없다', () => {
    let state = setup();
    state = stepBattle(state).state;

    // 1회 큐잉 + 발동 (횟수 차감)
    state = heroIntervene(state, shieldAbility);
    state = stepBattle(state).state; // 발동 → 차감

    // 2회째 시도 → 차단됨
    expect(state.hero.interventionsRemaining).toBe(0);
    const before = state.hero.interventionsRemaining;
    state = heroIntervene(state, shieldAbility);
    expect(state.hero.interventionsRemaining).toBe(before);
    expect(state.hero.queuedAbility).toBeUndefined(); // 큐잉 안 됨
  });

  it('새 라운드가 시작되면 개입 횟수가 초기화된다', () => {
    let state = setup();

    // 라운드 1 시작
    state = stepBattle(state).state;
    // 개입 큐잉 + 발동으로 소진
    state = heroIntervene(state, shieldAbility);
    state = stepBattle(state).state; // 발동 → 차감
    expect(state.hero.interventionsRemaining).toBe(0);

    // 라운드 1의 모든 턴 진행
    while (state.phase !== BattlePhase.ROUND_END && state.phase !== BattlePhase.BATTLE_END) {
      state = stepBattle(state).state;
    }

    if (!state.isFinished) {
      // 라운드 2 시작
      state = stepBattle(state).state;
      expect(state.hero.interventionsRemaining).toBe(1); // 리셋됨
    }
  });

  it('개입은 전투 이벤트 로그에 HERO_INTERVENTION으로 기록된다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const eventsBefore = state.events.length;
    state = heroIntervene(state, shieldAbility); // 큐잉
    state = stepBattle(state).state; // 발동 → 이벤트 기록

    const heroEvents = state.events.slice(eventsBefore).filter((e) => e.type === 'HERO_INTERVENTION');
    expect(heroEvents.length).toBeGreaterThan(0);
  });

  it('히어로 실드 개입: 다음 유닛 행동 직전에 아군에게 실드를 부여한다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const targetUnit = state.units.find((u) => u.team === Team.PLAYER)!;
    const eventsBefore = state.events.length;

    // 큐잉: 즉시 실드 적용 안 됨
    state = heroIntervene(state, shieldAbility, targetUnit.id);
    const allyAfterQueue = state.units.find((u) => u.id === targetUnit.id)!;
    expect(allyAfterQueue.shield).toBe(0); // 아직 미적용

    // 다음 stepBattle에서 발동 → SHIELD_APPLIED 이벤트 확인
    state = stepBattle(state).state;
    const shieldEvents = state.events.slice(eventsBefore).filter((e) => e.type === 'SHIELD_APPLIED');
    expect(shieldEvents.length).toBeGreaterThan(0);
  });

  it('히어로 밀기 개입: 다음 유닛 행동 직전에 적을 BACK으로 민다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const frontEnemy = state.units.find((u) => u.team === Team.ENEMY && u.position === Position.FRONT)!;

    const eventsBefore = state.events.length;
    // 큐잉
    state = heroIntervene(state, pushAbility, frontEnemy.id);
    // 발동
    state = stepBattle(state).state;

    // HERO_INTERVENTION 이벤트 확인 (push 발동됨)
    const heroEvents = state.events.slice(eventsBefore).filter((e) => e.type === 'HERO_INTERVENTION');
    expect(heroEvents.length).toBeGreaterThan(0);

    // 밀린 유닛의 포지션 확인 (이후 유닛 행동에 의해 변경되지 않았다면 BACK)
    const pushed = state.units.find((u) => u.id === frontEnemy.id);
    if (pushed?.isAlive) {
      expect(pushed.position).toBe(Position.BACK);
    }
  });

  // === 핵심 스펙: 개입 타이밍 ===

  it('개입은 유닛 행동 사이에 끼어들 수 있다 (턴 사이 개입)', () => {
    let state = setup();
    // 라운드 시작
    state = stepBattle(state).state;

    // 첫 번째 유닛 행동
    state = stepBattle(state).state;
    const afterFirstAction = state.turn;

    // 이 시점에서 히어로 개입 가능
    expect(canIntervene(state)).toBe(true);

    // 개입 큐잉 (§18: 즉시 발동이 아닌 큐잉)
    const targetAlly = state.units.find((u) => u.team === Team.PLAYER && u.isAlive)!;
    state = heroIntervene(state, shieldAbility, targetAlly.id);

    // 큐잉 후에도 전투가 계속 진행 가능
    expect(state.isFinished).toBe(false);

    // 다음 유닛이 행동할 수 있음 (개입은 그 직전에 발동)
    state = stepBattle(state).state;
    // 턴이 진행되었거나 라운드가 끝남
    expect(state.turn >= afterFirstAction || state.phase === BattlePhase.ROUND_END).toBe(true);
  });

  it('전투가 진행 중일 때 개입을 큐잉하면 다음 유닛 행동 직전에 발동된다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    // 몇 턴 진행
    state = stepBattle(state).state; // 1번째 유닛 행동
    state = stepBattle(state).state; // phase 전환

    // 아직 모든 유닛이 행동하지 않은 상태
    const unactedCount = state.units.filter((u) => u.isAlive && !u.hasActedThisRound).length;

    if (unactedCount > 0 && canIntervene(state)) {
      const ally = state.units.find((u) => u.team === Team.PLAYER && u.isAlive)!;

      // §18: 큐잉 직후에는 아직 효과 미적용
      state = heroIntervene(state, shieldAbility, ally.id);
      const allyAfterQueue = state.units.find((u) => u.id === ally.id)!;
      expect(allyAfterQueue.shield).toBe(0); // 아직 미적용

      // 다음 스텝에서 개입이 유닛 행동 직전에 발동 → HERO_INTERVENTION 이벤트 기록
      const prevEventCount = state.events.length;
      state = stepBattle(state).state;

      const heroEvents = state.events.slice(prevEventCount).filter((e) => e.type === 'HERO_INTERVENTION');
      expect(heroEvents.length).toBe(1);

      // 이후 전투가 계속 진행됨
      expect(state.turn).toBeGreaterThan(0);
    }
  });

  // === 이슈 #1: 히어로 DAMAGE가 COVER 시스템을 우회하는 버그 ===

  it('히어로 DAMAGE 능력은 COVER 유닛이 대신 피격해야 한다', () => {
    // 후열 적 타겟 + 전열 COVER 유닛 → 히어로 공격 시 COVER 발동
    const p1 = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E-Archer', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);
    const e2 = createUnit(createCharacterDef('E-Guardian', CharacterClass.GUARDIAN), Team.ENEMY, Position.FRONT);

    // e2(Guardian)에 COVER 버프 부여
    const e2WithCover: BattleUnit = {
      ...e2,
      buffs: [{ id: 'cover-1', type: BuffType.COVER, value: 0, duration: 3, sourceId: e2.id }],
    };

    let state = createBattleState([p1], [e1, e2WithCover]);

    const damageAbility: HeroAbility = {
      id: 'hero_fireball',
      name: 'Fireball',
      description: 'Deal damage to enemy',
      effects: [{ type: 'DAMAGE', value: 1, target: Target.ENEMY_ANY }],
      category: AbilityCategory.UNIQUE,
      abilityType: AbilityType.EFFECT,
    };

    // 라운드 시작
    state = stepBattle(state).state;

    const e1Before = state.units.find((u) => u.id === e1.id)!;
    const e2Before = state.units.find((u) => u.id === e2WithCover.id)!;
    const e1HpBefore = e1Before.stats.hp;
    const e2HpBefore = e2Before.stats.hp;

    // 히어로가 후열 적(e1)을 타겟으로 DAMAGE 발동
    const result = executeIntervention(state, damageAbility, e1.id);

    const e1After = result.state.units.find((u) => u.id === e1.id)!;
    const e2After = result.state.units.find((u) => u.id === e2WithCover.id)!;

    // COVER 발동: e1(후열)은 피해 없고 e2(전열 COVER)가 대신 피격
    expect(e1After.stats.hp).toBe(e1HpBefore); // 후열 타겟 무피해
    expect(e2After.stats.hp).toBeLessThan(e2HpBefore); // COVER 유닛이 대신 피격

    // COVER_TRIGGERED 이벤트 확인
    const coverEvents = result.events.filter((e) => e.type === 'COVER_TRIGGERED');
    expect(coverEvents.length).toBe(1);
  });
});
