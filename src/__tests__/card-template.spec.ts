import { describe, it, expect } from 'vitest';
import { generateCardVariant, generateRewardFromTemplates } from '../systems/ActionCardSystem';
import { CharacterClass, Rarity, Target } from '../types';
import type { CardTemplate } from '../types';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';

describe('카드 템플릿 변형 생성', () => {
  const singleOptionTemplate: CardTemplate = {
    id: 'test_slash',
    name: 'Slash',
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.WARRIOR,
    condition: { type: 'POSITION_FRONT' },
    effectTemplates: [
      { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2], targetPool: [Target.ENEMY_FRONT] },
    ],
  };

  const multiOptionTemplate: CardTemplate = {
    id: 'test_strike',
    name: 'Strike',
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.WARRIOR,
    condition: { type: 'POSITION_FRONT' },
    effectTemplates: [
      {
        type: 'DAMAGE',
        stat: 'atk',
        multiplierPool: [1.0, 1.1, 1.2],
        targetPool: [
          Target.ENEMY_FRONT,
          { side: 'ENEMY', position: 'FRONT', select: 'LOWEST_HP' },
          { side: 'ENEMY', position: 'FRONT', select: 'RANDOM' },
        ],
      },
    ],
  };

  describe('generateCardVariant', () => {
    it('단일 옵션 템플릿은 항상 같은 결과', () => {
      const action1 = generateCardVariant(singleOptionTemplate, 42);
      const action2 = generateCardVariant(singleOptionTemplate, 99);

      expect(action1.name).toBe('Slash');
      expect(action1.rarity).toBe(Rarity.COMMON);
      expect(action1.effects).toHaveLength(1);
      expect(action1.effects[0].value).toBe(1.2);
      expect(action1.effects[0].target).toEqual(Target.ENEMY_FRONT);

      // 다른 시드도 동일 (옵션 1개뿐이므로)
      expect(action2.effects[0].value).toBe(1.2);
      expect(action2.effects[0].target).toEqual(Target.ENEMY_FRONT);
    });

    it('id에 시드 기반 접미사 붙음', () => {
      const action = generateCardVariant(singleOptionTemplate, 42);
      expect(action.id).toBe('test_slash_v42');
    });

    it('description이 자동 생성됨', () => {
      const action = generateCardVariant(singleOptionTemplate, 42);
      expect(action.description).toContain('ATK x1.2');
    });

    it('다중 옵션 템플릿은 시드에 따라 다른 결과 가능', () => {
      // 여러 시드로 생성해서 최소 하나는 다른 결과가 나오는지 확인
      const results = new Set<number>();
      for (let seed = 0; seed < 20; seed++) {
        const action = generateCardVariant(multiOptionTemplate, seed);
        results.add(action.effects[0].value as number);
      }
      // 3개 옵션(1.0, 1.1, 1.2) 중 최소 2개는 나와야 함
      expect(results.size).toBeGreaterThanOrEqual(2);
    });

    it('같은 시드는 같은 결과 (결정론적)', () => {
      const a1 = generateCardVariant(multiOptionTemplate, 123);
      const a2 = generateCardVariant(multiOptionTemplate, 123);
      expect(a1.effects[0].value).toBe(a2.effects[0].value);
      expect(a1.effects[0].target).toEqual(a2.effects[0].target);
    });

    it('복합 효과 템플릿 (DAMAGE + PUSH)', () => {
      const template: CardTemplate = {
        id: 'test_driving',
        name: 'Driving Blow',
        rarity: Rarity.RARE,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      };

      const action = generateCardVariant(template, 1);
      expect(action.effects).toHaveLength(2);
      expect(action.effects[0].type).toBe('DAMAGE');
      expect(action.effects[1].type).toBe('PUSH');
      expect(action.effects[1].position).toBe('BACK');
    });
  });

  describe('generateRewardFromTemplates', () => {
    const templates: CardTemplate[] = [
      { ...singleOptionTemplate, id: 'tmpl_a', name: 'Card A' },
      { ...singleOptionTemplate, id: 'tmpl_b', name: 'Card B' },
      { ...singleOptionTemplate, id: 'tmpl_c', name: 'Card C' },
    ];

    it('count만큼 액션 생성', () => {
      const actions = generateRewardFromTemplates(templates, CharacterClass.WARRIOR, 2, 42);
      expect(actions).toHaveLength(2);
      actions.forEach(a => {
        expect(a.effects).toHaveLength(1);
        expect(a.rarity).toBe(Rarity.COMMON);
      });
    });

    it('풀보다 많이 요청하면 가능한 만큼만', () => {
      const actions = generateRewardFromTemplates(templates, CharacterClass.WARRIOR, 10, 42);
      expect(actions).toHaveLength(3);
    });

    it('클래스 제한 필터링', () => {
      const actions = generateRewardFromTemplates(templates, CharacterClass.ARCHER, 5, 42);
      expect(actions).toHaveLength(0); // 전부 WARRIOR 전용
    });

    it('같은 시드는 같은 결과', () => {
      const a1 = generateRewardFromTemplates(templates, CharacterClass.WARRIOR, 3, 99);
      const a2 = generateRewardFromTemplates(templates, CharacterClass.WARRIOR, 3, 99);
      expect(a1.map(a => a.name)).toEqual(a2.map(a => a.name));
    });
  });

  describe('워리어 cardTemplates 통합', () => {
    it('워리어 ClassTemplate에 cardTemplates 존재', () => {
      const warrior = CLASS_TEMPLATES[CharacterClass.WARRIOR];
      expect(warrior.cardTemplates).toBeDefined();
      expect(warrior.cardTemplates!.length).toBeGreaterThan(0);
    });

    it('워리어 템플릿에서 보상 생성 가능', () => {
      const warrior = CLASS_TEMPLATES[CharacterClass.WARRIOR];
      const actions = generateRewardFromTemplates(
        warrior.cardTemplates!,
        CharacterClass.WARRIOR,
        3,
        42,
      );
      expect(actions).toHaveLength(3);
      actions.forEach(a => {
        expect(a.effects.length).toBeGreaterThan(0);
        // 기본 카드는 classRestriction 없음, 특수 카드는 WARRIOR
        expect(
          a.classRestriction === undefined || a.classRestriction === CharacterClass.WARRIOR
        ).toBe(true);
      });
    });

    it('다중 옵션 템플릿은 시드에 따라 변형 생성', () => {
      const warrior = CLASS_TEMPLATES[CharacterClass.WARRIOR];
      const heavySlamTemplate = warrior.cardTemplates!.find(t => t.id === 'warrior_heavy_slam')!;

      // 여러 시드로 생성해서 최소 하나는 다른 결과가 나오는지 확인
      const results = new Set<number>();
      for (let seed = 0; seed < 20; seed++) {
        const action = generateCardVariant(heavySlamTemplate, seed);
        results.add(action.effects[0].value as number);
      }
      // 3개 옵션(1.3, 1.4, 1.5) 중 최소 2개는 나와야 함
      expect(results.size).toBeGreaterThanOrEqual(2);
      // 타겟은 항상 ENEMY_FRONT (옵션 1개뿐)
      const a = generateCardVariant(heavySlamTemplate, 1);
      expect(a.effects[0].target).toEqual(Target.ENEMY_FRONT);
    });
  });
});
