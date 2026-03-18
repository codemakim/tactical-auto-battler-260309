import { describe, it, expect } from 'vitest';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';
import { getAllTemplatesForClass, UNIVERSAL_CARD_TEMPLATES } from '../data/ActionPool';
import { CharacterClass, Rarity, Target } from '../types';

describe('전사 카드풀', () => {
  const template = CLASS_TEMPLATES[CharacterClass.WARRIOR];
  const templates = template.cardTemplates;

  it('cardTemplates 존재', () => {
    expect(templates).toBeDefined();
  });

  it('클래스 전용 풀 크기 = 10', () => {
    expect(templates).toHaveLength(10);
  });

  it('클래스 전용 COMMON 7장, RARE 3장', () => {
    const common = templates.filter(t => (t.rarity ?? 'COMMON') === Rarity.COMMON);
    const rare = templates.filter(t => t.rarity === Rarity.RARE);
    expect(common).toHaveLength(7);
    expect(rare).toHaveLength(3);
  });

  it('getAllTemplatesForClass는 클래스 전용 + 공용 카드 합산', () => {
    const all = getAllTemplatesForClass(CharacterClass.WARRIOR);
    expect(all).toHaveLength(templates.length + UNIVERSAL_CARD_TEMPLATES.length);
  });

  it('공용 카드 5종 포함', () => {
    expect(UNIVERSAL_CARD_TEMPLATES).toHaveLength(5);
    const ids = UNIVERSAL_CARD_TEMPLATES.map(t => t.id);
    expect(ids).toContain('universal_quick_strike');
    expect(ids).toContain('universal_guard');
    expect(ids).toContain('universal_recover');
    expect(ids).toContain('universal_rally');
    expect(ids).toContain('universal_feint');
  });

  it('Shield Bash: POSITION_FRONT, ATK×[1.1~1.3] + GRD×[0.7~0.9] 실드', () => {
    const card = templates.find(t => t.id === 'warrior_shield_bash')!;
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates).toHaveLength(2);
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.1, 1.2, 1.3], stat: 'atk' });
    expect(card.effectTemplates[1]).toMatchObject({ type: 'SHIELD', multiplierPool: [0.7, 0.8, 0.9], stat: 'grd' });
  });

  it('Heavy Slam: ATK×[1.3~1.5]', () => {
    const card = templates.find(t => t.id === 'warrior_heavy_slam')!;
    expect(card.rarity).toBe(Rarity.RARE);
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.3, 1.4, 1.5], stat: 'atk' });
  });

  it('Iron Wall: POSITION_FRONT, GRD×[1.1~1.3]', () => {
    const card = templates.find(t => t.id === 'warrior_iron_wall')!;
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'SHIELD', multiplierPool: [1.1, 1.2, 1.3], stat: 'grd' });
  });

  it('Advance: POSITION_BACK, MOVE FRONT', () => {
    const card = templates.find(t => t.id === 'warrior_advance')!;
    expect(card.condition.type).toBe('POSITION_BACK');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'MOVE', position: 'FRONT' });
  });

  it('Hold Ground: POSITION_FRONT, GRD×[0.9~1.1] (전열 유지용)', () => {
    const card = templates.find(t => t.id === 'warrior_hold_ground')!;
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'SHIELD', multiplierPool: [0.9, 1.0, 1.1], stat: 'grd' });
  });

  it('Driving Blow 존재: ATK×[0.8~1.0] + PUSH BACK', () => {
    const card = templates.find(t => t.id === 'warrior_driving_blow')!;
    expect(card).toBeDefined();
    expect(card.rarity).toBe(Rarity.RARE);
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [0.8, 0.9, 1.0], stat: 'atk' });
    expect(card.effectTemplates[1]).toMatchObject({ type: 'PUSH', position: 'BACK' });
  });

  it('Execution Cut (COMMON): ENEMY_HP_BELOW 30, ATK×[1.2~1.4] → ENEMY_FRONT (전열 마무리)', () => {
    const card = templates.find(t => t.id === 'warrior_execution_cut')!;
    expect(card).toBeDefined();
    expect(card.rarity).toBe(Rarity.COMMON);
    expect(card.condition).toMatchObject({ type: 'ENEMY_HP_BELOW', value: 30 });
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.2, 1.3, 1.4], targetPool: [Target.ENEMY_FRONT] });
  });

  it('Execution Cut (RARE): ENEMY_HP_BELOW 30, ATK×[1.2~1.4] → ENEMY_ANY (후열까지 마무리)', () => {
    const card = templates.find(t => t.id === 'warrior_execution_cut_rare')!;
    expect(card).toBeDefined();
    expect(card.rarity).toBe(Rarity.RARE);
    expect(card.condition).toMatchObject({ type: 'ENEMY_HP_BELOW', value: 30 });
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.2, 1.3, 1.4], targetPool: [Target.ENEMY_ANY] });
  });

  it('cardTemplates에 Heavy Slam [1.3~1.5], Iron Wall [1.1~1.3] 반영', () => {
    const heavySlam = templates.find(t => t.id === 'warrior_heavy_slam')!;
    expect(heavySlam.effectTemplates[0].multiplierPool).toEqual([1.3, 1.4, 1.5]);
    const ironWall = templates.find(t => t.id === 'warrior_iron_wall')!;
    expect(ironWall.effectTemplates[0].multiplierPool).toEqual([1.1, 1.2, 1.3]);
  });

  it('cardTemplates에 Driving Blow, Execution Cut 두 버전 추가됨', () => {
    expect(templates.find(t => t.id === 'warrior_driving_blow')).toBeDefined();
    expect(templates.find(t => t.id === 'warrior_execution_cut')).toBeDefined();
    expect(templates.find(t => t.id === 'warrior_execution_cut_rare')).toBeDefined();
  });
});
