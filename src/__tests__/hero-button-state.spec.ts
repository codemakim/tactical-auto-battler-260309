/**
 * 영웅 개입 버튼 상태 테스트
 *
 * getHeroButtonState(): HeroState → HeroButtonState (순수 함수)
 * cancelQueuedIntervention(): BattleState → BattleState (순수 함수)
 */
import { describe, it, expect } from 'vitest';
import { getHeroButtonState, cancelQueuedIntervention } from '../systems/HeroInterventionSystem';
import { HeroButtonState, HeroType, AbilityType, AbilityCategory } from '../types';
import type { HeroState, HeroAbility, BattleState } from '../types';

// === 헬퍼 ===

function createHeroState(overrides: Partial<HeroState> = {}): HeroState {
  return {
    heroType: HeroType.COMMANDER,
    interventionsRemaining: 1,
    maxInterventionsPerRound: 1,
    abilities: [],
    ...overrides,
  };
}

const mockAbility: HeroAbility = {
  id: 'rally',
  name: 'Rally',
  abilityType: AbilityType.EFFECT,
  category: AbilityCategory.UNIQUE,
  effects: [{ type: 'BUFF', buffType: 'ATK_UP', value: 3, duration: 2 }],
  description: 'ATK UP',
};

// === getHeroButtonState 테스트 ===

describe('getHeroButtonState', () => {
  it('전투 종료 시 DISABLED 반환', () => {
    const hero = createHeroState({ interventionsRemaining: 1 });
    expect(getHeroButtonState(hero, true, false)).toBe(HeroButtonState.DISABLED);
  });

  it('전투 종료는 다른 상태보다 우선', () => {
    const hero = createHeroState({ queuedAbility: mockAbility });
    expect(getHeroButtonState(hero, true, false)).toBe(HeroButtonState.DISABLED);
  });

  it('타겟 선택 중이면 TARGETING 반환', () => {
    const hero = createHeroState({ interventionsRemaining: 1 });
    expect(getHeroButtonState(hero, false, true)).toBe(HeroButtonState.TARGETING);
  });

  it('타겟 선택은 QUEUED보다 우선', () => {
    const hero = createHeroState({ queuedAbility: mockAbility });
    expect(getHeroButtonState(hero, false, true)).toBe(HeroButtonState.TARGETING);
  });

  it('능력 큐잉됨이면 QUEUED 반환', () => {
    const hero = createHeroState({
      interventionsRemaining: 1,
      queuedAbility: mockAbility,
    });
    expect(getHeroButtonState(hero, false, false)).toBe(HeroButtonState.QUEUED);
  });

  it('개입 횟수 남아있으면 READY 반환', () => {
    const hero = createHeroState({ interventionsRemaining: 1 });
    expect(getHeroButtonState(hero, false, false)).toBe(HeroButtonState.READY);
  });

  it('개입 횟수 2 이상이어도 READY', () => {
    const hero = createHeroState({ interventionsRemaining: 3 });
    expect(getHeroButtonState(hero, false, false)).toBe(HeroButtonState.READY);
  });

  it('개입 횟수 0이고 큐 없으면 USED 반환', () => {
    const hero = createHeroState({ interventionsRemaining: 0 });
    expect(getHeroButtonState(hero, false, false)).toBe(HeroButtonState.USED);
  });
});

// === cancelQueuedIntervention 테스트 ===

describe('cancelQueuedIntervention', () => {
  function createMinimalBattleState(heroOverrides: Partial<HeroState> = {}): BattleState {
    return {
      units: [],
      hero: createHeroState(heroOverrides),
      round: 1,
      turn: 1,
      phase: 'TURN_START',
      turnOrder: [],
      events: [],
      isFinished: false,
      winner: null,
      seed: 42,
      delayedEffects: [],
    } as unknown as BattleState;
  }

  it('큐잉된 능력을 제거', () => {
    const state = createMinimalBattleState({
      queuedAbility: mockAbility,
      queuedTargetId: 'unit-1',
    });

    const result = cancelQueuedIntervention(state);

    expect(result.hero.queuedAbility).toBeUndefined();
    expect(result.hero.queuedTargetId).toBeUndefined();
    expect(result.hero.queuedEditData).toBeUndefined();
  });

  it('interventionsRemaining은 변경하지 않음', () => {
    const state = createMinimalBattleState({
      interventionsRemaining: 1,
      queuedAbility: mockAbility,
    });

    const result = cancelQueuedIntervention(state);

    expect(result.hero.interventionsRemaining).toBe(1);
  });

  it('원본 state를 변경하지 않음 (불변성)', () => {
    const state = createMinimalBattleState({
      queuedAbility: mockAbility,
      queuedTargetId: 'unit-1',
    });

    const result = cancelQueuedIntervention(state);

    expect(state.hero.queuedAbility).toBe(mockAbility);
    expect(result.hero.queuedAbility).toBeUndefined();
    expect(result).not.toBe(state);
  });

  it('큐가 비어있어도 안전하게 동작', () => {
    const state = createMinimalBattleState();

    const result = cancelQueuedIntervention(state);

    expect(result.hero.queuedAbility).toBeUndefined();
    expect(result.hero.interventionsRemaining).toBe(1);
  });

  it('다른 hero 필드는 보존', () => {
    const state = createMinimalBattleState({
      heroType: HeroType.MAGE,
      interventionsRemaining: 0,
      maxInterventionsPerRound: 2,
      queuedAbility: mockAbility,
    });

    const result = cancelQueuedIntervention(state);

    expect(result.hero.heroType).toBe(HeroType.MAGE);
    expect(result.hero.interventionsRemaining).toBe(0);
    expect(result.hero.maxInterventionsPerRound).toBe(2);
  });
});
