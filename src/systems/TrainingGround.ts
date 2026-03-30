import { createUnit } from '../entities/UnitFactory';
import { Position, Team } from '../types';
import type { CharacterDefinition, TrainableStat } from '../types';
import { calculateTrainingCost, canAffordTraining, trainCharacter } from './TrainingSystem';

export interface TrainingOptionViewModel {
  stat: TrainableStat;
  label: string;
  disabled: boolean;
}

export interface TrainingCharacterViewModel {
  title: string;
  trainingLabel: string;
  costLabel: string;
  statusLabel: string;
  options: TrainingOptionViewModel[];
}

const TRAINING_LABELS: Record<TrainableStat, string> = {
  hp: 'HP +3',
  atk: 'ATK +1',
  grd: 'GRD +1',
  agi: 'AGI +1',
};

export function getTrainingCharacterViewModel(
  character: CharacterDefinition,
  gold: number,
): TrainingCharacterViewModel {
  const cost = calculateTrainingCost(character.trainingsUsed);
  const canTrain = character.trainingsUsed < character.trainingPotential;
  const canPay = canAffordTraining(gold, character.trainingsUsed);
  const disabled = !canTrain || !canPay;

  return {
    title: character.name,
    trainingLabel: `Training: ${character.trainingsUsed}/${character.trainingPotential}`,
    costLabel: `Next Cost: ${cost}G`,
    statusLabel: !canTrain ? '훈련 한도 도달' : canPay ? '훈련 가능' : '골드 부족',
    options: (Object.keys(TRAINING_LABELS) as TrainableStat[]).map((stat) => ({
      stat,
      label: TRAINING_LABELS[stat],
      disabled,
    })),
  };
}

export function applyTrainingToCharacter(
  character: CharacterDefinition,
  gold: number,
  stat: TrainableStat,
): { character: CharacterDefinition; remainingGold: number } | { error: string } {
  const unit = createUnit(character, Team.PLAYER, Position.FRONT);
  const result = trainCharacter(unit, gold, stat);
  if ('error' in result) {
    return result;
  }

  return {
    character: {
      ...character,
      baseStats: {
        hp: result.unit.stats.maxHp,
        atk: result.unit.stats.atk,
        grd: result.unit.stats.grd,
        agi: result.unit.stats.agi,
      },
      trainingsUsed: result.unit.trainingsUsed,
    },
    remainingGold: result.remainingGold,
  };
}
