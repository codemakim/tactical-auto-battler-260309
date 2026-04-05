import type { BattlefieldDefinition } from '../data/Battlefields';
import type { BattlefieldProgressState } from '../types';
import { getBattlefieldCardState } from './BattlefieldProgression';

export interface SortieBattlefieldViewModel {
  locked: boolean;
  name: string;
  theme: string;
  description: string;
  enemyPreview: string;
  statusText: string;
  unlockText?: string;
  recordText?: string;
  maxStagesLabel: string;
}

export function createSortieBattlefieldViewModel(
  battlefield: BattlefieldDefinition,
  battlefieldProgress: BattlefieldProgressState,
): SortieBattlefieldViewModel {
  const cardState = getBattlefieldCardState(battlefield.id, battlefieldProgress);

  return {
    locked: cardState.locked,
    name: battlefield.name,
    theme: battlefield.theme,
    description: battlefield.description,
    enemyPreview: battlefield.enemyPreview,
    statusText: cardState.statusText,
    unlockText: cardState.unlockText,
    recordText: cardState.recordText,
    maxStagesLabel: `${battlefield.runConfig.maxStages} 스테이지 런`,
  };
}
