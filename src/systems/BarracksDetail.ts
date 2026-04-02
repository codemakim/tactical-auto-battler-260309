import type { ActionSlot, CharacterDefinition } from '../types';

export interface BarracksRosterSummary {
  countLabel: string;
}

export interface CharacterDetailViewModel {
  title: string;
  classLabel: string;
  trainingLabel: string;
  statsLabel: string;
  actionSlots: ActionSlot[];
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
    actionSlots: character.baseActionSlots,
  };
}
