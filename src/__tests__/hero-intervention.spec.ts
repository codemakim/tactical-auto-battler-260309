import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, heroIntervene } from '../core/BattleEngine';
import { canIntervene } from '../systems/HeroInterventionSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase } from '../types';
import type { HeroAbility } from '../types';

describe('히어로 개입 시스템', () => {
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
    effects: [{ type: 'SHIELD', value: 30, target: 'SELF' }],
  };

  const pushAbility: HeroAbility = {
    id: 'hero_push',
    name: 'Force Push',
    description: 'Push enemy back',
    effects: [{ type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' }],
  };

  it('라운드당 최소 1회 개입이 가능하다', () => {
    let state = setup();
    // 라운드 시작
    state = stepBattle(state).state;

    expect(canIntervene(state)).toBe(true);
    expect(state.hero.interventionsRemaining).toBe(1);
  });

  it('개입을 사용하면 남은 횟수가 줄어든다', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    state = heroIntervene(state, shieldAbility);

    expect(state.hero.interventionsRemaining).toBe(0);
    expect(canIntervene(state)).toBe(false);
  });

  it('개입 횟수를 소진하면 더 이상 개입할 수 없다', () => {
    let state = setup();
    state = stepBattle(state).state;

    // 1회 사용
    state = heroIntervene(state, shieldAbility);
    // 2회째 시도 → 상태 변화 없어야 함
    const before = state.hero.interventionsRemaining;
    state = heroIntervene(state, shieldAbility);
    expect(state.hero.interventionsRemaining).toBe(before);
  });

  it('새 라운드가 시작되면 개입 횟수가 초기화된다', () => {
    let state = setup();

    // 라운드 1 시작
    state = stepBattle(state).state;
    // 개입 사용
    state = heroIntervene(state, shieldAbility);
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

  it('개입은 전투 이벤트 로그에 기록된다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const eventsBefore = state.events.length;
    state = heroIntervene(state, shieldAbility);

    const heroEvents = state.events.filter(e => e.type === 'HERO_INTERVENTION');
    expect(heroEvents.length).toBeGreaterThan(0);
  });

  it('히어로 실드 개입: 아군에게 실드를 부여한다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const targetUnit = state.units.find(u => u.team === Team.PLAYER)!;
    state = heroIntervene(state, shieldAbility, targetUnit.id);

    const updatedUnit = state.units.find(u => u.id === targetUnit.id)!;
    expect(updatedUnit.shield).toBeGreaterThan(0);
  });

  it('히어로 밀기 개입: 적을 BACK으로 밀 수 있다', () => {
    let state = setup();
    state = stepBattle(state).state;

    const frontEnemy = state.units.find(
      u => u.team === Team.ENEMY && u.position === Position.FRONT,
    )!;

    state = heroIntervene(state, pushAbility, frontEnemy.id);

    const pushed = state.units.find(u => u.id === frontEnemy.id)!;
    expect(pushed.position).toBe(Position.BACK);
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

    // 개입 실행
    const targetAlly = state.units.find(u => u.team === Team.PLAYER && u.isAlive)!;
    state = heroIntervene(state, shieldAbility, targetAlly.id);

    // 개입 후에도 전투가 계속 진행 가능
    expect(state.isFinished).toBe(false);

    // 다음 유닛이 행동할 수 있음
    state = stepBattle(state).state;
    // 턴이 진행되었거나 라운드가 끝남
    expect(state.turn >= afterFirstAction || state.phase === BattlePhase.ROUND_END).toBe(true);
  });

  it('전투가 진행 중일 때(캐릭터들이 행동 중) 개입하면 다음 캐릭터 행동 전에 효과 적용', () => {
    let state = setup();
    state = stepBattle(state).state; // 라운드 시작

    // 몇 턴 진행
    state = stepBattle(state).state; // 1번째 유닛 행동
    state = stepBattle(state).state; // phase 전환

    // 아직 모든 유닛이 행동하지 않은 상태
    const unactedCount = state.units.filter(u => u.isAlive && !u.hasActedThisRound).length;

    if (unactedCount > 0 && canIntervene(state)) {
      // 개입: 아군에 실드
      const ally = state.units.find(u => u.team === Team.PLAYER && u.isAlive)!;
      const shieldBefore = ally.shield;
      state = heroIntervene(state, shieldAbility, ally.id);

      const allyAfter = state.units.find(u => u.id === ally.id)!;
      // 실드가 즉시 적용되어 있음 → 다음 행동 전에 이미 효과 반영
      expect(allyAfter.shield).toBeGreaterThan(shieldBefore);

      // 이후 적의 공격이 와도 실드가 보호
      const nextStep = stepBattle(state).state;
      expect(nextStep.turn).toBeGreaterThanOrEqual(state.turn);
    }
  });
});
