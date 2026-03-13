import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

describe('캐릭터 생성 스탯 (§23.5)', () => {
  beforeEach(() => resetUnitCounter());

  // Warrior baseStats: { hp: 53, atk: 12, grd: 7, agi: 6 }

  it('createCharacterDef는 고정 baseStats를 사용한다', () => {
    const charDef = createCharacterDef('Warrior', CharacterClass.WARRIOR);
    const unit = createUnit(charDef, Team.PLAYER, Position.FRONT);

    expect(unit.stats.hp).toBe(53);
    expect(unit.stats.atk).toBe(12);
    expect(unit.stats.grd).toBe(7);
    expect(unit.stats.agi).toBe(6);
  });

  it('trainingsUsed 기본값은 0이다', () => {
    const charDef = createCharacterDef('Warrior', CharacterClass.WARRIOR);
    const unit = createUnit(charDef, Team.PLAYER, Position.FRONT);

    expect(unit.trainingsUsed).toBe(0);
    expect(unit.trainingPotential).toBe(3);
  });

  it('createCharacterDef에 trainingsUsed / trainingPotential 지정 가능', () => {
    const charDef = createCharacterDef('Warrior', CharacterClass.WARRIOR, 2, 5);
    const unit = createUnit(charDef, Team.PLAYER, Position.FRONT);

    expect(unit.trainingsUsed).toBe(2);
    expect(unit.trainingPotential).toBe(5);
  });
});

describe('시드 기반 캐릭터 생성 (§23.5)', () => {
  beforeEach(() => resetUnitCounter());

  it('같은 seed는 같은 스탯을 생성한다', async () => {
    const { generateCharacterDef } = await import('../entities/UnitFactory');

    const def1 = generateCharacterDef('Test', CharacterClass.WARRIOR, 42);
    const def2 = generateCharacterDef('Test', CharacterClass.WARRIOR, 42);

    expect(def1.baseStats).toEqual(def2.baseStats);
    expect(def1.trainingPotential).toBe(def2.trainingPotential);
  });

  it('다른 seed는 다른 스탯을 생성한다', async () => {
    const { generateCharacterDef } = await import('../entities/UnitFactory');

    const results = new Set<string>();
    for (let s = 0; s < 20; s++) {
      const def = generateCharacterDef('Test', CharacterClass.WARRIOR, s);
      results.add(JSON.stringify(def.baseStats));
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('Warrior 스탯이 클래스 범위 내에 있다', async () => {
    const { generateCharacterDef } = await import('../entities/UnitFactory');

    for (let s = 0; s < 50; s++) {
      const def = generateCharacterDef('Test', CharacterClass.WARRIOR, s);
      expect(def.baseStats.hp).toBeGreaterThanOrEqual(48);
      expect(def.baseStats.hp).toBeLessThanOrEqual(58);
      expect(def.baseStats.atk).toBeGreaterThanOrEqual(11);
      expect(def.baseStats.atk).toBeLessThanOrEqual(13);
      expect(def.baseStats.grd).toBeGreaterThanOrEqual(6);
      expect(def.baseStats.grd).toBeLessThanOrEqual(8);
      expect(def.baseStats.agi).toBeGreaterThanOrEqual(5);
      expect(def.baseStats.agi).toBeLessThanOrEqual(7);
    }
  });

  it('Assassin 스탯이 클래스 범위 내에 있다', async () => {
    const { generateCharacterDef } = await import('../entities/UnitFactory');

    for (let s = 0; s < 50; s++) {
      const def = generateCharacterDef('Test', CharacterClass.ASSASSIN, s);
      expect(def.baseStats.hp).toBeGreaterThanOrEqual(34);
      expect(def.baseStats.hp).toBeLessThanOrEqual(42);
      expect(def.baseStats.atk).toBeGreaterThanOrEqual(13);
      expect(def.baseStats.atk).toBeLessThanOrEqual(16);
      expect(def.baseStats.grd).toBeGreaterThanOrEqual(2);
      expect(def.baseStats.grd).toBeLessThanOrEqual(4);
      expect(def.baseStats.agi).toBeGreaterThanOrEqual(10);
      expect(def.baseStats.agi).toBeLessThanOrEqual(12);
    }
  });

  it('trainingPotential이 2~5 범위이다', async () => {
    const { generateCharacterDef } = await import('../entities/UnitFactory');

    for (let s = 0; s < 50; s++) {
      const def = generateCharacterDef('Test', CharacterClass.WARRIOR, s);
      expect(def.trainingPotential).toBeGreaterThanOrEqual(2);
      expect(def.trainingPotential).toBeLessThanOrEqual(5);
    }
  });

  it('trainingsUsed는 항상 0으로 시작한다', async () => {
    const { generateCharacterDef } = await import('../entities/UnitFactory');

    const def = generateCharacterDef('Test', CharacterClass.LANCER, 99);
    expect(def.trainingsUsed).toBe(0);
  });
});
