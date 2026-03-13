import type { BattleUnit, TrainableStat } from '../types';

// 훈련 비용 공식: (trainingsUsed + 1) * 25 + 25
// 0회→1회: 50골드, 1회→2회: 75골드, 2회→3회: 100골드, ...
const TRAINING_COST_BASE = 25;
const TRAINING_COST_MULTIPLIER = 25;

// 스탯별 훈련 증가량 (§24)
const STAT_INCREMENT: Record<TrainableStat, number> = {
  hp: 3,
  atk: 1,
  grd: 1,
  agi: 1,
};

/**
 * 다음 훈련 비용 계산
 * trainingsUsed 0 → 50골드, 1 → 75골드, 2 → 100골드
 */
export function calculateTrainingCost(trainingsUsed: number): number {
  return (trainingsUsed + 1) * TRAINING_COST_MULTIPLIER + TRAINING_COST_BASE;
}

/**
 * 현재 골드로 훈련 가능한지 판별
 */
export function canAffordTraining(gold: number, trainingsUsed: number): boolean {
  return gold >= calculateTrainingCost(trainingsUsed);
}

/**
 * 훈련 잠재력이 남아있는지 판별
 */
export function canTrain(unit: BattleUnit): boolean {
  return unit.trainingsUsed < unit.trainingPotential;
}

/**
 * 유닛 훈련 수행 (§24)
 * 플레이어가 스탯을 선택하여 훈련한다.
 * - HP: +3, ATK/GRD/AGI: +1
 * - trainingsUsed >= trainingPotential이면 훈련 불가
 * - 골드 부족 시 { error } 반환
 * 성공 시 훈련된 유닛과 차감된 골드 반환 (불변)
 */
export function trainCharacter(
  unit: BattleUnit,
  gold: number,
  stat: TrainableStat,
): { unit: BattleUnit; remainingGold: number } | { error: string } {
  if (!canTrain(unit)) {
    return { error: `훈련 한도 도달: ${unit.trainingsUsed}/${unit.trainingPotential}` };
  }

  const cost = calculateTrainingCost(unit.trainingsUsed);

  if (!canAffordTraining(gold, unit.trainingsUsed)) {
    return { error: `골드 부족: 훈련 비용 ${cost}골드, 현재 ${gold}골드` };
  }

  const increment = STAT_INCREMENT[stat];
  const isHp = stat === 'hp';

  const updatedUnit: BattleUnit = {
    ...unit,
    trainingsUsed: unit.trainingsUsed + 1,
    stats: {
      ...unit.stats,
      [stat]: unit.stats[stat] + increment,
      ...(isHp ? { maxHp: unit.stats.maxHp + increment } : {}),
    },
  };

  return { unit: updatedUnit, remainingGold: gold - cost };
}
