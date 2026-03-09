import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDamage, applyDamage, applyShield } from '../systems/DamageSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

describe('데미지 시스템', () => {
  beforeEach(() => resetUnitCounter());

  it('데미지 = ATK × 배율 - DEF, 최소 1', () => {
    const attacker = createUnit(createCharacterDef('Attacker', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const defender = createUnit(createCharacterDef('Defender', CharacterClass.GUARDIAN), Team.ENEMY, Position.FRONT);

    // Warrior ATK:20, 배율 1.2 → 24 - Guardian DEF:20 = 4
    const dmg = calculateDamage(attacker, defender, 1.2);
    expect(dmg).toBe(4);
  });

  it('DEF가 공격력보다 높아도 최소 1 데미지', () => {
    const weak = createUnit(createCharacterDef('Weak', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const tank = createUnit(createCharacterDef('Tank', CharacterClass.GUARDIAN), Team.ENEMY, Position.FRONT);

    // Guardian ATK:12, 배율 0.5 → 6 - DEF:20 = -14 → 최소 1
    const dmg = calculateDamage(weak, tank, 0.5);
    expect(dmg).toBe(1);
  });

  it('데미지 적용 시 HP가 감소한다', () => {
    const unit = createUnit(createCharacterDef('Target', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const initialHp = unit.stats.hp; // 110

    const result = applyDamage(unit, 30, 'attacker', 1, 1);

    expect(result.unit.stats.hp).toBe(initialHp - 30);
    expect(result.unit.isAlive).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('DAMAGE_DEALT');
  });

  it('HP가 0이 되면 유닛이 죽는다', () => {
    const unit = createUnit(createCharacterDef('Target', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);
    // Archer HP:75

    const result = applyDamage(unit, 999, 'attacker', 1, 1);

    expect(result.unit.stats.hp).toBe(0);
    expect(result.unit.isAlive).toBe(false);
    expect(result.events).toHaveLength(2); // DAMAGE_DEALT + UNIT_DIED
    expect(result.events[1].type).toBe('UNIT_DIED');
  });

  it('실드가 데미지를 먼저 흡수한다', () => {
    const unit = createUnit(createCharacterDef('Shielded', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    // shield 20 부여
    const shielded = applyShield(unit, 20, 1, 1).unit;

    // 30 데미지 → shield 20 흡수 → 실제 HP 10만 감소
    const result = applyDamage(shielded, 30, 'attacker', 1, 1);

    expect(result.unit.shield).toBe(0);
    expect(result.unit.stats.hp).toBe(unit.stats.hp - 10);
  });

  it('실드가 데미지보다 크면 HP 변화 없음', () => {
    const unit = createUnit(createCharacterDef('Tank', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const shielded = applyShield(unit, 50, 1, 1).unit;

    const result = applyDamage(shielded, 30, 'attacker', 1, 1);

    expect(result.unit.shield).toBe(20); // 50 - 30
    expect(result.unit.stats.hp).toBe(unit.stats.hp); // HP 변화 없음
  });
});
