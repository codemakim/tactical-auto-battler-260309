import type { CharacterDefinition } from '../types';

export interface BarracksRosterSummary {
  countLabel: string;
}

export interface CharacterDetailViewModel {
  title: string;
  classLabel: string;
  trainingLabel: string;
  statsLabel: string;
  actionsLabel: string[];
}

export function getBarracksRosterSummary(currentCount: number, maxSlots: number): BarracksRosterSummary {
  return {
    countLabel: `보유 캐릭터 ${currentCount}/${maxSlots}`,
  };
}

export function getCharacterDetailViewModel(character: CharacterDefinition): CharacterDetailViewModel {
  return {
    title: character.name,
    classLabel: `Class: ${character.characterClass}`,
    trainingLabel: `Training: ${character.trainingsUsed}/${character.trainingPotential}`,
    statsLabel: `HP ${character.baseStats.hp}  ATK ${character.baseStats.atk}  GRD ${character.baseStats.grd}  AGI ${character.baseStats.agi}`,
    actionsLabel: character.baseActionSlots.map(
      (slot, index) => `${index + 1}. ${slot.condition.type} -> ${slot.action.name}`,
    ),
  };
}
