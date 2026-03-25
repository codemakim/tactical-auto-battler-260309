/**
 * FormationCardCalculator 테스트
 *
 * getSlotDisplayData(): CharacterDefinition × RunState → SlotDisplayData[]
 * swapBaseActionSlots(): 마을 모드 슬롯 순서 교환
 * swapRunActionSlots(): 런 모드 슬롯 순서 교환
 */
import { describe, it, expect } from 'vitest';
import { getSlotDisplayData, swapBaseActionSlots, swapRunActionSlots } from '../systems/FormationCardCalculator';
import { RunStatus, Target } from '../types';
import type { CharacterDefinition, RunState, CardInstance } from '../types';

// === 헬퍼 ===

function createCharDef(id: string): CharacterDefinition {
  return {
    id,
    name: `Char-${id}`,
    characterClass: 'WARRIOR',
    baseStats: { hp: 100, atk: 10, grd: 5, agi: 10 },
    baseActionSlots: [
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'base-0',
          name: 'Strike',
          description: 'Basic',
          effects: [{ type: 'DAMAGE', target: Target.ENEMY_FRONT, value: 1.0 }],
        },
      },
      {
        condition: { type: 'HP_BELOW', value: 50 },
        action: { id: 'base-1', name: 'Defend', description: 'Shield', effects: [{ type: 'SHIELD', value: 1.0 }] },
      },
      {
        condition: { type: 'ALWAYS' },
        action: { id: 'base-2', name: 'Guard', description: 'Fallback', effects: [{ type: 'SHIELD', value: 0.8 }] },
      },
    ],
    trainingsUsed: 0,
    trainingPotential: 3,
  };
}

function createCard(instanceId: string, name: string): CardInstance {
  return {
    instanceId,
    templateId: `tmpl-${instanceId}`,
    action: {
      id: `action-${instanceId}`,
      name,
      description: `Card ${name}`,
      effects: [{ type: 'DAMAGE', target: Target.ENEMY_FRONT, value: 1.5 }],
    },
    rarity: 'RARE',
  };
}

function createRunState(charDef: CharacterDefinition, overrides: Partial<RunState> = {}): RunState {
  return {
    currentStage: 1,
    maxStages: 5,
    seed: 42,
    party: [charDef],
    bench: [],
    cardInventory: [],
    equippedCards: {},
    gold: 0,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: [{ ...charDef }],
    ...overrides,
  };
}

// === 테스트 ===

describe('getSlotDisplayData', () => {
  it('런 없을 때 기본 슬롯 3개 반환', () => {
    const charDef = createCharDef('c1');
    const result = getSlotDisplayData(charDef, undefined);

    expect(result).toHaveLength(3);
    expect(result[0].isBase).toBe(true);
    expect(result[0].equippedCard).toBeNull();
    expect(result[0].action.name).toBe('Strike');
    expect(result[1].action.name).toBe('Defend');
    expect(result[2].action.name).toBe('Guard');
  });

  it('런 있지만 카드 미장착 시 기본 슬롯', () => {
    const charDef = createCharDef('c1');
    const runState = createRunState(charDef);
    const result = getSlotDisplayData(charDef, runState);

    expect(result).toHaveLength(3);
    result.forEach((slot) => {
      expect(slot.isBase).toBe(true);
      expect(slot.equippedCard).toBeNull();
    });
  });

  it('슬롯 0에 카드 장착 시 해당 슬롯만 카드 반영', () => {
    const charDef = createCharDef('c1');
    const card = createCard('card-a', 'Power Strike');
    const runState = createRunState(charDef, {
      cardInventory: [card],
      equippedCards: { c1: { 0: 'card-a' } },
    });

    const result = getSlotDisplayData(charDef, runState);

    expect(result[0].isBase).toBe(false);
    expect(result[0].equippedCard).toBe(card);
    expect(result[0].action.name).toBe('Power Strike');
    expect(result[1].isBase).toBe(true);
    expect(result[2].isBase).toBe(true);
  });

  it('여러 슬롯에 카드 장착', () => {
    const charDef = createCharDef('c1');
    const cardA = createCard('card-a', 'Power Strike');
    const cardB = createCard('card-b', 'Heavy Guard');
    const runState = createRunState(charDef, {
      cardInventory: [cardA, cardB],
      equippedCards: { c1: { 0: 'card-a', 2: 'card-b' } },
    });

    const result = getSlotDisplayData(charDef, runState);

    expect(result[0].equippedCard).toBe(cardA);
    expect(result[1].equippedCard).toBeNull();
    expect(result[2].equippedCard).toBe(cardB);
  });

  it('slotIndex가 순서대로 0, 1, 2', () => {
    const charDef = createCharDef('c1');
    const result = getSlotDisplayData(charDef, undefined);

    expect(result.map((s) => s.slotIndex)).toEqual([0, 1, 2]);
  });

  it('인벤토리에 없는 카드 ID면 기본 슬롯 폴백', () => {
    const charDef = createCharDef('c1');
    const runState = createRunState(charDef, {
      cardInventory: [],
      equippedCards: { c1: { 0: 'nonexistent-card' } },
    });

    const result = getSlotDisplayData(charDef, runState);

    expect(result[0].isBase).toBe(true);
    expect(result[0].equippedCard).toBeNull();
  });

  it('condition은 항상 baseSlot의 condition 사용', () => {
    const charDef = createCharDef('c1');
    const card = createCard('card-a', 'Power Strike');
    const runState = createRunState(charDef, {
      cardInventory: [card],
      equippedCards: { c1: { 1: 'card-a' } },
    });

    const result = getSlotDisplayData(charDef, runState);

    // 슬롯 1의 condition은 HP_BELOW (기본 슬롯 것)
    expect(result[1].condition.type).toBe('HP_BELOW');
    expect(result[1].action.name).toBe('Power Strike');
  });
});

describe('swapBaseActionSlots', () => {
  it('슬롯 0과 1 교환', () => {
    const charDef = createCharDef('c1');
    const result = swapBaseActionSlots(charDef, 0, 1);

    expect(result.baseActionSlots[0].action.name).toBe('Defend');
    expect(result.baseActionSlots[1].action.name).toBe('Strike');
    expect(result.baseActionSlots[2].action.name).toBe('Guard');
  });

  it('같은 인덱스면 변경 없음', () => {
    const charDef = createCharDef('c1');
    const result = swapBaseActionSlots(charDef, 1, 1);

    expect(result).toBe(charDef);
  });

  it('범위 밖 인덱스면 변경 없음', () => {
    const charDef = createCharDef('c1');
    expect(swapBaseActionSlots(charDef, -1, 1)).toBe(charDef);
    expect(swapBaseActionSlots(charDef, 0, 5)).toBe(charDef);
  });

  it('원본 불변', () => {
    const charDef = createCharDef('c1');
    const result = swapBaseActionSlots(charDef, 0, 2);

    expect(charDef.baseActionSlots[0].action.name).toBe('Strike');
    expect(result.baseActionSlots[0].action.name).toBe('Guard');
  });
});

describe('swapRunActionSlots', () => {
  it('기본 슬롯만 있을 때 교환', () => {
    const charDef = createCharDef('c1');
    const runState = createRunState(charDef);
    const result = swapRunActionSlots(runState, 'c1', 0, 2);

    expect(result.party[0].baseActionSlots[0].action.name).toBe('Guard');
    expect(result.party[0].baseActionSlots[2].action.name).toBe('Strike');
  });

  it('장착 카드 매핑도 함께 교환', () => {
    const charDef = createCharDef('c1');
    const cardA = createCard('card-a', 'Power Strike');
    const runState = createRunState(charDef, {
      cardInventory: [cardA],
      equippedCards: { c1: { 0: 'card-a' } },
    });

    const result = swapRunActionSlots(runState, 'c1', 0, 1);

    // 슬롯 0에 있던 card-a가 슬롯 1로 이동
    expect(result.equippedCards['c1'][1]).toBe('card-a');
    expect(result.equippedCards['c1'][0]).toBeUndefined();
  });

  it('양쪽 다 카드 장착 시 교환', () => {
    const charDef = createCharDef('c1');
    const cardA = createCard('card-a', 'Power Strike');
    const cardB = createCard('card-b', 'Heavy Guard');
    const runState = createRunState(charDef, {
      cardInventory: [cardA, cardB],
      equippedCards: { c1: { 0: 'card-a', 2: 'card-b' } },
    });

    const result = swapRunActionSlots(runState, 'c1', 0, 2);

    expect(result.equippedCards['c1'][0]).toBe('card-b');
    expect(result.equippedCards['c1'][2]).toBe('card-a');
  });

  it('존재하지 않는 캐릭터면 변경 없음', () => {
    const charDef = createCharDef('c1');
    const runState = createRunState(charDef);
    const result = swapRunActionSlots(runState, 'nonexistent', 0, 1);

    expect(result).toBe(runState);
  });

  it('같은 인덱스면 변경 없음', () => {
    const charDef = createCharDef('c1');
    const runState = createRunState(charDef);
    const result = swapRunActionSlots(runState, 'c1', 1, 1);

    expect(result).toBe(runState);
  });
});
