import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

describe('훈련 레벨 보너스 (Training Level)', () => {
  beforeEach(() => resetUnitCounter());

  // Warrior base stats: { hp: 110, atk: 20, def: 12, agi: 8 }

  it('훈련 레벨 0은 기본 스탯을 가진다', () => {
    const def = createCharacterDef('Warrior', CharacterClass.WARRIOR, 0);
    const unit = createUnit(def, Team.PLAYER, Position.FRONT);

    expect(unit.stats.hp).toBe(110);
    expect(unit.stats.atk).toBe(20);
    expect(unit.stats.def).toBe(12);
    expect(unit.stats.agi).toBe(8);
  });

  it('훈련 레벨 1은 ATK +1 보너스를 준다', () => {
    const def = createCharacterDef('Warrior', CharacterClass.WARRIOR, 1);
    const unit = createUnit(def, Team.PLAYER, Position.FRONT);

    expect(unit.stats.atk).toBe(21); // 20 + 1
    expect(unit.stats.hp).toBe(110); // unchanged
    expect(unit.stats.def).toBe(12); // unchanged
    expect(unit.stats.agi).toBe(8);  // unchanged
  });

  it('훈련 레벨 2는 레벨 1에 추가로 HP +3 보너스를 준다', () => {
    const def = createCharacterDef('Warrior', CharacterClass.WARRIOR, 2);
    const unit = createUnit(def, Team.PLAYER, Position.FRONT);

    expect(unit.stats.atk).toBe(21);  // 20 + 1
    expect(unit.stats.hp).toBe(113);  // 110 + 3
    expect(unit.stats.def).toBe(12);  // unchanged
    expect(unit.stats.agi).toBe(8);   // unchanged
  });

  it('훈련 레벨 3은 레벨 1-2에 추가로 AGI +1 보너스를 준다', () => {
    const def = createCharacterDef('Warrior', CharacterClass.WARRIOR, 3);
    const unit = createUnit(def, Team.PLAYER, Position.FRONT);

    expect(unit.stats.atk).toBe(21);  // 20 + 1
    expect(unit.stats.hp).toBe(113);  // 110 + 3
    expect(unit.stats.def).toBe(12);  // unchanged
    expect(unit.stats.agi).toBe(9);   // 8 + 1
  });
});
