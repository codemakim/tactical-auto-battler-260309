/**
 * 훈련 골드 소비 테스트 — §24 캐릭터 훈련 골드 소비
 *
 * 검증 항목:
 *   1. 비용 계산 — calculateTrainingCost
 *   2. 골드 가능 여부 — canAffordTraining
 *   3. 훈련 수행 — trainCharacter (성공 / 골드 부족)
 *   4. 스탯 보너스 적용 확인
 *   5. 불변성 — 원본 유닛 변경 없음
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { calculateTrainingCost, canAffordTraining, trainCharacter } from '../systems/TrainingSystem';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

function makeWarrior(trainingLevel = 0) {
  const def = createCharacterDef('TestWarrior', CharacterClass.WARRIOR, trainingLevel);
  return createUnit(def, Team.PLAYER, Position.FRONT);
}

describe('훈련 골드 소비 (§24)', () => {
  beforeEach(() => resetUnitCounter());

  // ═══════════════════════════════════════════
  // 1. 비용 계산
  // ═══════════════════════════════════════════

  describe('1. calculateTrainingCost', () => {
    it('레벨 0 → 1 훈련 비용은 50골드', () => {
      expect(calculateTrainingCost(0)).toBe(50);
    });

    it('레벨 1 → 2 훈련 비용은 75골드', () => {
      expect(calculateTrainingCost(1)).toBe(75);
    });

    it('레벨 2 → 3 훈련 비용은 100골드', () => {
      expect(calculateTrainingCost(2)).toBe(100);
    });

    it('레벨 3 → 4 훈련 비용은 125골드', () => {
      expect(calculateTrainingCost(3)).toBe(125);
    });

    it('비용은 레벨에 비례해 25골드씩 증가한다', () => {
      for (let level = 0; level < 5; level++) {
        const expected = (level + 1) * 25 + 25;
        expect(calculateTrainingCost(level)).toBe(expected);
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

    it('레벨 1 훈련 비용(75골드) 검증', () => {
      expect(canAffordTraining(74, 1)).toBe(false);
      expect(canAffordTraining(75, 1)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // 3. 훈련 수행 — 성공
  // ═══════════════════════════════════════════

  describe('3. trainCharacter — 성공 케이스', () => {
    it('훈련 후 골드가 비용만큼 차감된다', () => {
      const unit = makeWarrior(0);
      const result = trainCharacter(unit, 100);

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.remainingGold).toBe(100 - 50); // 50골드 차감
    });

    it('훈련 후 유닛의 trainingLevel이 1 증가한다', () => {
      const unit = makeWarrior(0);
      const result = trainCharacter(unit, 100);

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.trainingLevel).toBe(1);
    });

    it('레벨 0→1 훈련: ATK +1 보너스', () => {
      const unit = makeWarrior(0);
      const atkBefore = unit.stats.atk;
      const result = trainCharacter(unit, 100);

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.stats.atk).toBe(atkBefore + 1);
      expect(result.unit.stats.hp).toBe(unit.stats.hp); // HP 변동 없음
      expect(result.unit.stats.agi).toBe(unit.stats.agi); // AGI 변동 없음
    });

    it('레벨 1→2 훈련: HP +3 보너스', () => {
      const unit = makeWarrior(1); // 이미 레벨 1
      const hpBefore = unit.stats.hp;
      const result = trainCharacter(unit, 100);

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.stats.hp).toBe(hpBefore + 3);
      expect(result.unit.stats.maxHp).toBe(unit.stats.maxHp + 3);
      expect(result.unit.stats.atk).toBe(unit.stats.atk); // ATK 변동 없음
    });

    it('레벨 2→3 훈련: AGI +1 보너스', () => {
      const unit = makeWarrior(2);
      const agiBefore = unit.stats.agi;
      const result = trainCharacter(unit, 150);

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.unit.stats.agi).toBe(agiBefore + 1);
    });

    it('정확히 비용만큼의 골드로 훈련하면 remainingGold가 0이다', () => {
      const unit = makeWarrior(0);
      const result = trainCharacter(unit, 50);

      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.remainingGold).toBe(0);
    });
  });

  // ═══════════════════════════════════════════
  // 4. 훈련 수행 — 골드 부족
  // ═══════════════════════════════════════════

  describe('4. trainCharacter — 골드 부족 거부', () => {
    it('골드 부족 시 error를 포함한 객체를 반환한다', () => {
      const unit = makeWarrior(0);
      const result = trainCharacter(unit, 49);

      expect('error' in result).toBe(true);
      if (!('error' in result)) return;
      expect(typeof result.error).toBe('string');
      expect(result.error.length).toBeGreaterThan(0);
    });

    it('골드 부족 시 유닛 상태가 변경되지 않는다 (에러 확인)', () => {
      const unit = makeWarrior(0);
      const result = trainCharacter(unit, 0);

      expect('error' in result).toBe(true);
    });

    it('레벨 1 훈련 비용 부족 시 에러 반환', () => {
      const unit = makeWarrior(1);
      const result = trainCharacter(unit, 74); // 75골드 필요

      expect('error' in result).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // 5. 불변성
  // ═══════════════════════════════════════════

  describe('5. 불변성 — 원본 유닛 변경 없음', () => {
    it('훈련 성공 후 원본 유닛이 변경되지 않는다', () => {
      const unit = makeWarrior(0);
      const originalAtk = unit.stats.atk;
      const originalLevel = unit.trainingLevel;

      trainCharacter(unit, 100);

      expect(unit.stats.atk).toBe(originalAtk);
      expect(unit.trainingLevel).toBe(originalLevel);
    });

    it('연속 훈련 시 각 결과가 독립적이다', () => {
      const unit = makeWarrior(0);

      const result1 = trainCharacter(unit, 200);
      expect('error' in result1).toBe(false);
      if ('error' in result1) return;

      // 두 번째 훈련은 result1.unit을 기반으로
      const result2 = trainCharacter(result1.unit, result1.remainingGold);
      expect('error' in result2).toBe(false);
      if ('error' in result2) return;

      expect(result2.unit.trainingLevel).toBe(2);
      // 레벨 2는 HP +3 (레벨 1에서 ATK +1 이미 적용됨)
      expect(result2.unit.stats.hp).toBe(unit.stats.hp + 3);
      expect(result2.remainingGold).toBe(200 - 50 - 75); // 75골드 남음
    });
  });
});
