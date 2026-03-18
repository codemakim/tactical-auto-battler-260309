import { describe, it, expect } from 'vitest';
import { generateCharacterDef, createCharacterDef } from '../entities/UnitFactory';
import { drawInitialCards } from '../systems/ActionCardSystem';
import { CharacterClass, Rarity, Target } from '../types';
import type { CardTemplate } from '../types';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';

describe('액션 슬롯 배정', () => {
  it('전사 generateCharacterDef → 3개 슬롯이 cardTemplates에서 추첨됨', () => {
    const def = generateCharacterDef('Test', CharacterClass.WARRIOR, 42);
    expect(def.baseActionSlots).toHaveLength(3);

    const template = CLASS_TEMPLATES[CharacterClass.WARRIOR];
    const validIds = template.cardTemplates.map(t => t.id);
    for (const slot of def.baseActionSlots) {
      // 생성된 id는 `{templateId}_v{seed}` 형식
      const baseId = slot.action.id.replace(/_v\d+$/, '');
      expect(validIds).toContain(baseId);
    }
  });

  it('동일 seed = 동일 결과 (결정론)', () => {
    const def1 = generateCharacterDef('A', CharacterClass.WARRIOR, 777);
    const def2 = generateCharacterDef('A', CharacterClass.WARRIOR, 777);
    expect(def1.baseActionSlots.map(s => s.action.id))
      .toEqual(def2.baseActionSlots.map(s => s.action.id));
  });

  it('모든 클래스가 cardTemplates에서 슬롯 추첨됨', () => {
    const classes = [CharacterClass.LANCER, CharacterClass.ARCHER, CharacterClass.GUARDIAN, CharacterClass.CONTROLLER, CharacterClass.ASSASSIN];
    for (const cls of classes) {
      const def = generateCharacterDef('Test', cls, 42);
      expect(def.baseActionSlots).toHaveLength(3);

      const template = CLASS_TEMPLATES[cls];
      const validIds = template.cardTemplates.map(t => t.id);
      for (const slot of def.baseActionSlots) {
        const baseId = slot.action.id.replace(/_v\d+$/, '');
        expect(validIds).toContain(baseId);
      }
    }
  });

  it('createCharacterDef는 여전히 고정 슬롯 반환', () => {
    const def = createCharacterDef('Warrior', CharacterClass.WARRIOR);
    const template = CLASS_TEMPLATES[CharacterClass.WARRIOR];
    const expectedIds = template.baseActionSlots.map(s => s.action.id);
    expect(def.baseActionSlots.map(s => s.action.id)).toEqual(expectedIds);
  });

  it('drawInitialCards는 풀보다 많이 요청하면 고유 name 수만큼만 반환', () => {
    const template = CLASS_TEMPLATES[CharacterClass.WARRIOR];
    const result = drawInitialCards(template.cardTemplates, 100, 42);
    // Execution Cut이 COMMON/RARE 2장이지만 name 중복이라 1장만 뽑힘
    const uniqueNames = new Set(template.cardTemplates.map(t => t.name));
    expect(result).toHaveLength(uniqueNames.size);
  });

  it('같은 이름의 변형 템플릿은 동시에 뽑히지 않음', () => {
    // Execution Cut (COMMON) + Execution Cut (RARE) 같은 name 중복 케이스
    const dupeTemplates: CardTemplate[] = [
      {
        id: 'test_a_common', name: 'Test A', rarity: Rarity.COMMON,
        condition: { type: 'ALWAYS' },
        effectTemplates: [{ type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_FRONT] }],
      },
      {
        id: 'test_a_rare', name: 'Test A', rarity: Rarity.RARE,
        condition: { type: 'ALWAYS' },
        effectTemplates: [{ type: 'DAMAGE', stat: 'atk', multiplierPool: [1.5], targetPool: [Target.ENEMY_ANY] }],
      },
      {
        id: 'test_b', name: 'Test B', rarity: Rarity.COMMON,
        condition: { type: 'ALWAYS' },
        effectTemplates: [{ type: 'SHIELD', stat: 'grd', multiplierPool: [1.0], targetPool: [Target.SELF] }],
      },
    ];

    for (let seed = 0; seed < 50; seed++) {
      const slots = drawInitialCards(dupeTemplates, 3, seed);
      // 최대 2장 (Test A 중 1개 + Test B)
      expect(slots.length).toBeLessThanOrEqual(2);
      const names = slots.map(s => s.action.name);
      // 같은 이름 카드가 2장 이상 나오면 안 됨
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it('모든 클래스의 cardTemplates가 존재', () => {
    const allClasses = [CharacterClass.WARRIOR, CharacterClass.LANCER, CharacterClass.ARCHER, CharacterClass.GUARDIAN, CharacterClass.CONTROLLER, CharacterClass.ASSASSIN];
    for (const cls of allClasses) {
      const template = CLASS_TEMPLATES[cls];
      expect(template.cardTemplates).toBeDefined();
      expect(template.cardTemplates.length).toBeGreaterThan(0);
    }
  });

  it('추첨된 슬롯은 중복 없음', () => {
    const def = generateCharacterDef('Test', CharacterClass.WARRIOR, 42);
    const ids = def.baseActionSlots.map(s => s.action.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('추첨된 슬롯에 condition이 템플릿에서 복사됨', () => {
    const def = generateCharacterDef('Test', CharacterClass.WARRIOR, 42);
    for (const slot of def.baseActionSlots) {
      expect(slot.condition).toBeDefined();
      expect(slot.condition.type).toBeDefined();
    }
  });
});
