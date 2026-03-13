import { describe, it, expect, beforeEach } from 'vitest';
import { calculateDamage, calculateShield, applyDamage, applyShield } from '../systems/DamageSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

describe('데미지 시스템', () => {
  beforeEach(() => resetUnitCounter());

  it('데미지 = floor(ATK × 배율), DEF 감산 없음', () => {
    const attacker = createUnit(createCharacterDef('Attacker', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const defender = createUnit(createCharacterDef('Defender', CharacterClass.GUARDIAN), Team.ENEMY, Position.FRONT);

    // Warrior ATK:12, 배율 1.2 → floor(14.4) = 14
    const dmg = calculateDamage(attacker, defender, 1.2);
    expect(dmg).toBe(14);
  });

  it('낮은 배율이라도 floor(ATK × 배율)만큼 데미지가 들어간다', () => {
    const weak = createUnit(createCharacterDef('Weak', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const tank = createUnit(createCharacterDef('Tank', CharacterClass.GUARDIAN), Team.ENEMY, Position.FRONT);

    // Guardian ATK:8, 배율 0.5 → floor(4) = 4
    const dmg = calculateDamage(weak, tank, 0.5);
    expect(dmg).toBe(4);
  });

  it('데미지 적용 시 HP가 감소한다', () => {
    const unit = createUnit(createCharacterDef('Target', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const initialHp = unit.stats.hp; // 53

    const result = applyDamage(unit, 30, 'attacker', 1, 1);

    expect(result.unit.stats.hp).toBe(initialHp - 30);
    expect(result.unit.isAlive).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('DAMAGE_DEALT');
  });

  it('HP가 0이 되면 유닛이 죽는다', () => {
    const unit = createUnit(createCharacterDef('Target', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);

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

describe('실드 생성 공식 (§12.2)', () => {
  beforeEach(() => resetUnitCounter());

  it('실드 = floor(GRD × 배율)', () => {
    const guardian = createUnit(createCharacterDef('G', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    // Guardian GRD: 11, 배율 1.0 → 11
    const shield = calculateShield(guardian, 1.0);
    expect(shield).toBe(11);
  });

  it('높은 배율로 강화 방어', () => {
    const guardian = createUnit(createCharacterDef('G', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    // Guardian GRD: 11, 배율 1.5 → floor(16.5) = 16
    const shield = calculateShield(guardian, 1.5);
    expect(shield).toBe(16);
  });

  it('낮은 배율로 경미한 방어', () => {
    const guardian = createUnit(createCharacterDef('G', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    // Guardian GRD: 11, 배율 0.8 → floor(8.8) = 8
    const shield = calculateShield(guardian, 0.8);
    expect(shield).toBe(8);
  });

  it('GRD가 낮은 클래스는 실드 생성량이 적다', () => {
    const assassin = createUnit(createCharacterDef('A', CharacterClass.ASSASSIN), Team.PLAYER, Position.FRONT);
    // Assassin GRD: 3, 배율 1.0 → 3
    const shield = calculateShield(assassin, 1.0);
    expect(shield).toBe(3);
  });
});
