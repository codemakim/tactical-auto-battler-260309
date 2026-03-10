import type { BattleUnit } from '../types';

// 훈련 비용 공식: (currentLevel + 1) * 25 + 25
// 레벨 0→1: 50골드, 1→2: 75골드, 2→3: 100골드, ...
const TRAINING_COST_BASE = 25;
const TRAINING_COST_MULTIPLIER = 25;

/**
 * 다음 레벨 훈련 비용 계산
 * currentLevel 0 → 50골드, 1 → 75골드, 2 → 100골드
 */
export function calculateTrainingCost(currentLevel: number): number {
  return (currentLevel + 1) * TRAINING_COST_MULTIPLIER + TRAINING_COST_BASE;
}

/**
 * 현재 골드로 훈련 가능한지 판별
 */
export function canAffordTraining(gold: number, currentLevel: number): boolean {
  return gold >= calculateTrainingCost(currentLevel);
}

/**
 * 유닛 훈련 수행
 * 골드 부족 시 { error } 반환
 * 성공 시 훈련 레벨이 1 오른 유닛(스탯 보너스 포함)과 차감된 골드 반환 (불변)
 *
 * 스탯 보너스 패턴 (applyTrainingBonuses 로직과 동일):
 *   nextLevel % 3 === 1 → ATK +1
 *   nextLevel % 3 === 2 → HP +3 (maxHp 포함)
 *   nextLevel % 3 === 0 → AGI +1
 */
export function trainCharacter(
  unit: BattleUnit,
  gold: number,
): { unit: BattleUnit; remainingGold: number } | { error: string } {
  const currentLevel = unit.trainingLevel;
  const cost = calculateTrainingCost(currentLevel);

  if (!canAffordTraining(gold, currentLevel)) {
    return { error: `골드 부족: 훈련 비용 ${cost}골드, 현재 ${gold}골드` };
  }

  const nextLevel = currentLevel + 1;
  const mod = nextLevel % 3;
  const atkBonus = mod === 1 ? 1 : 0;
  const hpBonus = mod === 2 ? 3 : 0;
  const agiBonus = mod === 0 ? 1 : 0;

  const updatedUnit: BattleUnit = {
    ...unit,
    trainingLevel: nextLevel,
    stats: {
      ...unit.stats,
      hp: unit.stats.hp + hpBonus,
      maxHp: unit.stats.maxHp + hpBonus,
      atk: unit.stats.atk + atkBonus,
      agi: unit.stats.agi + agiBonus,
    },
  };

  return { unit: updatedUnit, remainingGold: gold - cost };
}
