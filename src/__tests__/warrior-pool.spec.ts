import { describe, it, expect } from 'vitest';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';
import { CharacterClass, Rarity } from '../types';

describe('전사 카드풀', () => {
  const template = CLASS_TEMPLATES[CharacterClass.WARRIOR];
  const pool = template.actionPool!;

  it('actionPool 존재', () => {
    expect(pool).toBeDefined();
  });

  it('풀 크기 = 10', () => {
    expect(pool).toHaveLength(10);
  });

  it('COMMON 7장, RARE 3장', () => {
    const common = pool.filter(s => (s.action.rarity ?? 'COMMON') === Rarity.COMMON);
    const rare = pool.filter(s => s.action.rarity === Rarity.RARE);
    expect(common).toHaveLength(7);
    expect(rare).toHaveLength(3);
  });

  it('Shield Bash: POSITION_FRONT, ATK×1.2 + GRD×0.8 실드', () => {
    const slot = pool.find(s => s.action.id === 'warrior_shield_bash')!;
    expect(slot.condition.type).toBe('POSITION_FRONT');
    expect(slot.action.effects).toHaveLength(2);
    expect(slot.action.effects[0]).toMatchObject({ type: 'DAMAGE', value: 1.2, stat: 'atk' });
    expect(slot.action.effects[1]).toMatchObject({ type: 'SHIELD', value: 0.8, stat: 'grd' });
  });

  it('Heavy Slam: ATK×1.4 (기존 1.6→1.4)', () => {
    const slot = pool.find(s => s.action.id === 'warrior_heavy_slam')!;
    expect(slot.action.rarity).toBe(Rarity.RARE);
    expect(slot.condition.type).toBe('POSITION_FRONT');
    expect(slot.action.effects[0]).toMatchObject({ type: 'DAMAGE', value: 1.4, stat: 'atk' });
  });

  it('Iron Wall: POSITION_FRONT, GRD×1.2 (Hold Ground 상위 전열 방어)', () => {
    const slot = pool.find(s => s.action.id === 'warrior_iron_wall')!;
    expect(slot.condition.type).toBe('POSITION_FRONT');
    expect(slot.action.effects[0]).toMatchObject({ type: 'SHIELD', value: 1.2, stat: 'grd' });
  });

  it('Advance: POSITION_BACK, MOVE FRONT', () => {
    const slot = pool.find(s => s.action.id === 'warrior_advance')!;
    expect(slot.condition.type).toBe('POSITION_BACK');
    expect(slot.action.effects[0]).toMatchObject({ type: 'MOVE', position: 'FRONT' });
  });

  it('Hold Ground: POSITION_FRONT, GRD×1.0 (전열 유지용)', () => {
    const slot = pool.find(s => s.action.id === 'warrior_hold_ground')!;
    expect(slot.condition.type).toBe('POSITION_FRONT');
    expect(slot.action.effects[0]).toMatchObject({ type: 'SHIELD', value: 1.0, stat: 'grd' });
  });

  it('Driving Blow 존재: ATK×0.9 + PUSH BACK', () => {
    const slot = pool.find(s => s.action.id === 'warrior_driving_blow')!;
    expect(slot).toBeDefined();
    expect(slot.action.rarity).toBe(Rarity.RARE);
    expect(slot.action.effects[0]).toMatchObject({ type: 'DAMAGE', value: 0.9, stat: 'atk' });
    expect(slot.action.effects[1]).toMatchObject({ type: 'PUSH', position: 'BACK' });
  });

  it('Execution Cut (COMMON): ENEMY_HP_BELOW 30, ATK×1.3 → ENEMY_FRONT (전열 마무리)', () => {
    const slot = pool.find(s => s.action.id === 'warrior_execution_cut')!;
    expect(slot).toBeDefined();
    expect(slot.action.rarity).toBe(Rarity.COMMON);
    expect(slot.condition).toMatchObject({ type: 'ENEMY_HP_BELOW', value: 30 });
    expect(slot.action.effects[0]).toMatchObject({ type: 'DAMAGE', value: 1.3, target: 'ENEMY_FRONT' });
  });

  it('Execution Cut (RARE): ENEMY_HP_BELOW 30, ATK×1.3 → ENEMY_ANY (후열까지 마무리)', () => {
    const slot = pool.find(s => s.action.id === 'warrior_execution_cut_rare')!;
    expect(slot).toBeDefined();
    expect(slot.action.rarity).toBe(Rarity.RARE);
    expect(slot.condition).toMatchObject({ type: 'ENEMY_HP_BELOW', value: 30 });
    expect(slot.action.effects[0]).toMatchObject({ type: 'DAMAGE', value: 1.3, target: 'ENEMY_ANY' });
  });

  it('classActions에도 Heavy Slam 1.4, Iron Wall 1.2 반영', () => {
    const heavySlam = template.classActions.find(a => a.id === 'warrior_heavy_slam')!;
    expect(heavySlam.effects[0].value).toBe(1.4);
    const ironWall = template.classActions.find(a => a.id === 'warrior_iron_wall')!;
    expect(ironWall.effects[0].value).toBe(1.2);
  });

  it('classActions에 Driving Blow, Execution Cut 두 버전 추가됨', () => {
    expect(template.classActions.find(a => a.id === 'warrior_driving_blow')).toBeDefined();
    expect(template.classActions.find(a => a.id === 'warrior_execution_cut')).toBeDefined();
    expect(template.classActions.find(a => a.id === 'warrior_execution_cut_rare')).toBeDefined();
  });
});
