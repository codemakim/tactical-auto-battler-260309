/**
 * 훈련 골드 소비 테스트 — §24 캐릭터 훈련
 *
 * 검증 항목:
 *   1. 비용 계산 — calculateTrainingCost
 *   2. 골드 가능 여부 — canAffordTraining
 *   3. 훈련 가능 여부 — canTrain (잠재력 기반)
 *   4. 훈련 수행 — trainCharacter (스탯 선택, 성공/실패)
 *   5. 불변성 — 원본 유닛 변경 없음
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateTrainingCost, canAffordTraining, canTrain, trainCharacter } from '../systems/TrainingSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

function makeWarrior(trainingsUsed = 0, trainingPotential = 3) {
  const def = createCharacterDef('TestWarrior', CharacterClass.WARRIOR, trainingsUsed, trainingPotential);
  return createUnit(def, Team.PLAYER, Position.FRONT);
}

describe('훈련 골드 소비 (§24)', () => {
  beforeEach(() => resetUnitCounter());

  // ═══════════════════════════════════════════
  // 1. 비용 계산
  // ═══════════════════════════════════════════

  describe('1. calculateTrainingCost', () => {
    it('0회 → 1회 훈련 비용은 50골드', () => {
      expect(calculateTrainingCost(0)).toBe(50);
    });

    it('1회 → 2회 훈련 비용은 75골드', () => {
      expect(calculateTrainingCost(1)).toBe(75);
    });

    it('2회 → 3회 훈련 비용은 100골드', () => {
      expect(calculateTrainingCost(2)).toBe(100);
    });

    it('3회 → 4회 훈련 비용은 125골드', () => {
      expect(calculateTrainingCost(3)).toBe(125);
    });

    it('비용은 횟수에 비례해 25골드씩 증가한다', () => {
      for (let used = 0; used < 5; used++) {
        const expected = (used + 1) * 25 + 25;
        expect(calculateTrainingCost(used)).toBe(expected);
      }
    });
  });

  // ═══════════════════════════════════════════
  // 2. 골드 가능 여부
  // ═══════════════════════════════════════════

  describe('2. canAffordTraining', () => {
    it('정확한 비용의 골드로 훈련 가능하다', () => {
      expect(canAffordTraining(50, 0)).toBe(true);
    });

    it('비용보다 많은 골드로도 훈련 가능하다', () => {
      expect(canAffordTraining(100, 0)).toBe(true);
    });

    it('비용보다 1골드 적으면 훈련 불가능하다', () => {
      expect(canAffordTraining(49, 0)).toBe(false);
    });

    it('골드 0으로는 훈련 불가능하다', () => {
      expect(canAffordTraining(0, 0)).toBe(false);
    });

    it('1회 훈련 비용(75골드) 검증', () => {
      expect(canAffordTraining(74, 1)).toBe(false);
      expect(canAffordTraining(75, 1)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // 3. 훈련 가능 여부 (잠재력)
  // ═══════════════════════════════════════════

  describe('3. canTrain — 잠재력 기반', () => {
    it('trainingsUsed < trainingPotential이면 훈련 가능', () => {
      const unit = makeWarrior(0, 3);
      expect(canTrain(unit)).toBe(true);
    });

    it('trainingsUsed === trainingPotential이면 훈련 불가', () => {
      const unit = makeWarrior(3, 3);
      expect(canTrain(unit)).toBe(false);
    });

    it('trainingsUsed가 1이고 potential이 2이면 훈련 가능', () => {
      const unit = makeWarrior(1, 2);
      expect(canTrain(unit)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // 4. 훈련 수행 — 스탯 선택
  // ═══════════════════════════════════════════

  describe('4. trainCharacter — 스탯 선택 훈련', () => {
    it('ATK 훈련: ATK +1', () => {
      const unit = makeWarrior(0, 3);
      const atkBefore = unit.stats.atk;
      const result = trainCharacter(unit, 100, 'atk');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.stats.atk).toBe(atkBefore + 1);
      expect(result.unit.stats.hp).toBe(unit.stats.hp); // 변동 없음
    });

    it('HP 훈련: HP +3, maxHp +3', () => {
      const unit = makeWarrior(0, 3);
      const hpBefore = unit.stats.hp;
      const result = trainCharacter(unit, 100, 'hp');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.stats.hp).toBe(hpBefore + 3);
      expect(result.unit.stats.maxHp).toBe(unit.stats.maxHp + 3);
    });

    it('GRD 훈련: GRD +1', () => {
      const unit = makeWarrior(0, 3);
      const grdBefore = unit.stats.grd;
      const result = trainCharacter(unit, 100, 'grd');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.stats.grd).toBe(grdBefore + 1);
    });

    it('AGI 훈련: AGI +1', () => {
      const unit = makeWarrior(0, 3);
      const agiBefore = unit.stats.agi;
      const result = trainCharacter(unit, 100, 'agi');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.stats.agi).toBe(agiBefore + 1);
    });

    it('훈련 후 trainingsUsed가 1 증가한다', () => {
      const unit = makeWarrior(0, 3);
      const result = trainCharacter(unit, 100, 'atk');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.trainingsUsed).toBe(1);
    });

    it('훈련 후 골드가 비용만큼 차감된다', () => {
      const unit = makeWarrior(0, 3);
      const result = trainCharacter(unit, 100, 'atk');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.remainingGold).toBe(50); // 100 - 50
    });

    it('정확히 비용만큼의 골드로 훈련하면 remainingGold가 0이다', () => {
      const unit = makeWarrior(0, 3);
      const result = trainCharacter(unit, 50, 'atk');

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.remainingGold).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  // 5. 훈련 실패 케이스
  // ═══════════════════════════════════════════

  describe('5. trainCharacter — 실패', () => {
    it('골드 부족 시 error를 반환한다', () => {
      const unit = makeWarrior(0, 3);
      const result = trainCharacter(unit, 49, 'atk');

      expect('error' in result).toBe(true);
    });

    it('잠재력 소진 시 error를 반환한다', () => {
      const unit = makeWarrior(3, 3); // trainingsUsed === trainingPotential
      const result = trainCharacter(unit, 1000, 'atk');

      expect('error' in result).toBe(true);
      if (!('error' in result)) return;
      expect(result.error).toContain('한도');
    });

    it('잠재력 2인 캐릭터는 2회까지만 훈련 가능', () => {
      const unit = makeWarrior(2, 2);
      const result = trainCharacter(unit, 1000, 'hp');

      expect('error' in result).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // 6. 불변성
  // ═══════════════════════════════════════════

  describe('6. 불변성 — 원본 유닛 변경 없음', () => {
    it('훈련 성공 후 원본 유닛이 변경되지 않는다', () => {
      const unit = makeWarrior(0, 3);
      const originalAtk = unit.stats.atk;
      const originalUsed = unit.trainingsUsed;

      trainCharacter(unit, 100, 'atk');

      expect(unit.stats.atk).toBe(originalAtk);
      expect(unit.trainingsUsed).toBe(originalUsed);
    });

    it('연속 훈련 시 각 결과가 독립적이다', () => {
      const unit = makeWarrior(0, 5);

      const result1 = trainCharacter(unit, 300, 'atk');
      expect('error' in result1).toBe(false);
      if ('error' in result1) return;

      const result2 = trainCharacter(result1.unit, result1.remainingGold, 'hp');
      expect('error' in result2).toBe(false);
      if ('error' in result2) return;

      expect(result2.unit.trainingsUsed).toBe(2);
      expect(result2.unit.stats.atk).toBe(unit.stats.atk + 1); // ATK +1
      expect(result2.unit.stats.hp).toBe(unit.stats.hp + 3); // HP +3
      expect(result2.remainingGold).toBe(300 - 50 - 75); // 175골드 남음
    });
  });
});
