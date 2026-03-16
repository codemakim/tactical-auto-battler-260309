import { describe, it, expect } from 'vitest';
import { generateCharacterDef, createCharacterDef, drawWeightedSlots } from '../entities/UnitFactory';
import { CharacterClass } from '../types';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';

describe('랜덤 액션 슬롯 배정', () => {
  const warriorPool = CLASS_TEMPLATES[CharacterClass.WARRIOR].actionPool!;

  it('전사 generateCharacterDef → 3개 슬롯이 풀에서 추첨됨', () => {
    const def = generateCharacterDef('Test', CharacterClass.WARRIOR, 42);
    expect(def.baseActionSlots).toHaveLength(3);

    const poolIds = warriorPool.map(s => s.action.id);
    for (const slot of def.baseActionSlots) {
      expect(poolIds).toContain(slot.action.id);
    }
  });

  it('중복 없음 검증 (100 seeds)', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const def = generateCharacterDef('W', CharacterClass.WARRIOR, seed);
      const ids = def.baseActionSlots.map(s => s.action.id);
      expect(new Set(ids).size).toBe(3);
    }
  });

  it('동일 seed = 동일 결과 (결정론)', () => {
    const def1 = generateCharacterDef('A', CharacterClass.WARRIOR, 777);
    const def2 = generateCharacterDef('A', CharacterClass.WARRIOR, 777);
    expect(def1.baseActionSlots.map(s => s.action.id))
      .toEqual(def2.baseActionSlots.map(s => s.action.id));
  });

  it('다른 seed = 다른 결과 (변동성)', () => {
    // 1000개 seed 중 최소 2가지 이상 조합이 나와야 함
    const combos = new Set<string>();
    for (let seed = 1; seed <= 1000; seed++) {
      const def = generateCharacterDef('W', CharacterClass.WARRIOR, seed);
      combos.add(def.baseActionSlots.map(s => s.action.id).join(','));
    }
    expect(combos.size).toBeGreaterThan(5);
  });

  it('COMMON이 RARE보다 자주 등장 (1000 seeds 통계)', () => {
    const counts: Record<string, number> = {};
    for (let seed = 1; seed <= 1000; seed++) {
      const def = generateCharacterDef('W', CharacterClass.WARRIOR, seed);
      for (const slot of def.baseActionSlots) {
        const rarity = slot.action.rarity ?? 'COMMON';
        counts[rarity] = (counts[rarity] ?? 0) + 1;
      }
    }
    // COMMON 총 등장 > RARE 총 등장
    expect(counts['COMMON'] ?? 0).toBeGreaterThan(counts['RARE'] ?? 0);
  });

  it('모든 클래스가 actionPool에서 추첨됨', () => {
    const classes = [CharacterClass.LANCER, CharacterClass.ARCHER, CharacterClass.GUARDIAN, CharacterClass.CONTROLLER, CharacterClass.ASSASSIN];
    for (const cls of classes) {
      const def = generateCharacterDef('Test', cls, 42);
      const pool = CLASS_TEMPLATES[cls].actionPool!;
      expect(pool).toBeDefined();
      const poolIds = pool.map(s => s.action.id);
      for (const slot of def.baseActionSlots) {
        expect(poolIds).toContain(slot.action.id);
      }
    }
  });

  it('createCharacterDef는 여전히 고정 슬롯 반환', () => {
    const def = createCharacterDef('Warrior', CharacterClass.WARRIOR);
    const template = CLASS_TEMPLATES[CharacterClass.WARRIOR];
    const expectedIds = template.baseActionSlots.map(s => s.action.id);
    expect(def.baseActionSlots.map(s => s.action.id)).toEqual(expectedIds);
  });

  it('drawWeightedSlots는 풀보다 많이 요청하면 풀 크기만큼만 반환', () => {
    let i = 0;
    const rand = () => { i++; return (i * 0.1) % 1; };
    const result = drawWeightedSlots(warriorPool, 20, rand);
    expect(result).toHaveLength(warriorPool.length);
  });
});
