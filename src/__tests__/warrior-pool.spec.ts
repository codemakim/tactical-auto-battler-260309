import { describe, it, expect } from 'vitest';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';
import { CharacterClass, Rarity, Target } from '../types';

describe('전사 카드풀', () => {
  const template = CLASS_TEMPLATES[CharacterClass.WARRIOR];
  const templates = template.cardTemplates;

  it('cardTemplates 존재', () => {
    expect(templates).toBeDefined();
  });

  it('풀 크기 = 10', () => {
    expect(templates).toHaveLength(10);
  });

  it('COMMON 7장, RARE 3장', () => {
    const common = templates.filter(t => (t.rarity ?? 'COMMON') === Rarity.COMMON);
    const rare = templates.filter(t => t.rarity === Rarity.RARE);
    expect(common).toHaveLength(7);
    expect(rare).toHaveLength(3);
  });

  it('Shield Bash: POSITION_FRONT, ATK×1.2 + GRD×0.8 실드', () => {
    const card = templates.find(t => t.id === 'warrior_shield_bash')!;
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates).toHaveLength(2);
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.2], stat: 'atk' });
    expect(card.effectTemplates[1]).toMatchObject({ type: 'SHIELD', multiplierPool: [0.8], stat: 'grd' });
  });

  it('Heavy Slam: ATK×1.4 (기존 1.6→1.4)', () => {
    const card = templates.find(t => t.id === 'warrior_heavy_slam')!;
    expect(card.rarity).toBe(Rarity.RARE);
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.4], stat: 'atk' });
  });

  it('Iron Wall: POSITION_FRONT, GRD×1.2 (Hold Ground 상위 전열 방어)', () => {
    const card = templates.find(t => t.id === 'warrior_iron_wall')!;
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'SHIELD', multiplierPool: [1.2], stat: 'grd' });
  });

  it('Advance: POSITION_BACK, MOVE FRONT', () => {
    const card = templates.find(t => t.id === 'warrior_advance')!;
    expect(card.condition.type).toBe('POSITION_BACK');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'MOVE', position: 'FRONT' });
  });

  it('Hold Ground: POSITION_FRONT, GRD×1.0 (전열 유지용)', () => {
    const card = templates.find(t => t.id === 'warrior_hold_ground')!;
    expect(card.condition.type).toBe('POSITION_FRONT');
    expect(card.effectTemplates[0]).toMatchObject({ type: 'SHIELD', multiplierPool: [1.0], stat: 'grd' });
  });

  it('Driving Blow 존재: ATK×0.9 + PUSH BACK', () => {
    const card = templates.find(t => t.id === 'warrior_driving_blow')!;
    expect(card).toBeDefined();
    expect(card.rarity).toBe(Rarity.RARE);
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [0.9], stat: 'atk' });
    expect(card.effectTemplates[1]).toMatchObject({ type: 'PUSH', position: 'BACK' });
  });

  it('Execution Cut (COMMON): ENEMY_HP_BELOW 30, ATK×1.3 → ENEMY_FRONT (전열 마무리)', () => {
    const card = templates.find(t => t.id === 'warrior_execution_cut')!;
    expect(card).toBeDefined();
    expect(card.rarity).toBe(Rarity.COMMON);
    expect(card.condition).toMatchObject({ type: 'ENEMY_HP_BELOW', value: 30 });
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.3], targetPool: [Target.ENEMY_FRONT] });
  });

  it('Execution Cut (RARE): ENEMY_HP_BELOW 30, ATK×1.3 → ENEMY_ANY (후열까지 마무리)', () => {
    const card = templates.find(t => t.id === 'warrior_execution_cut_rare')!;
    expect(card).toBeDefined();
    expect(card.rarity).toBe(Rarity.RARE);
    expect(card.condition).toMatchObject({ type: 'ENEMY_HP_BELOW', value: 30 });
    expect(card.effectTemplates[0]).toMatchObject({ type: 'DAMAGE', multiplierPool: [1.3], targetPool: [Target.ENEMY_ANY] });
  });

  it('cardTemplates에 Heavy Slam 1.4, Iron Wall 1.2 반영', () => {
    const heavySlam = templates.find(t => t.id === 'warrior_heavy_slam')!;
    expect(heavySlam.effectTemplates[0].multiplierPool[0]).toBe(1.4);
    const ironWall = templates.find(t => t.id === 'warrior_iron_wall')!;
    expect(ironWall.effectTemplates[0].multiplierPool[0]).toBe(1.2);
  });

  it('cardTemplates에 Driving Blow, Execution Cut 두 버전 추가됨', () => {
    expect(templates.find(t => t.id === 'warrior_driving_blow')).toBeDefined();
    expect(templates.find(t => t.id === 'warrior_execution_cut')).toBeDefined();
    expect(templates.find(t => t.id === 'warrior_execution_cut_rare')).toBeDefined();
  });
});
