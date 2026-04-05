import type { CharacterDefinition, Position } from '../types';
import type { FormationData, FormationPreset } from '../core/GameState';

export type BarracksDismissBlockReason = 'run-active' | 'minimum-roster' | 'missing-character';

export interface BarracksDismissState {
  canDismiss: boolean;
  reason?: BarracksDismissBlockReason;
  helperLabel?: string;
}

export interface BarracksDismissableState {
  characters: CharacterDefinition[];
  formation: FormationData;
  presets: FormationPreset[];
}

export interface BarracksDismissResult {
  dismissed: boolean;
  nextState: BarracksDismissableState;
}

function cloneFormation(formation: FormationData): FormationData {
  return {
    heroType: formation.heroType,
    slots: formation.slots.map((slot) => ({ characterId: slot.characterId, position: slot.position as Position })),
  };
}

function removeCharacterFromFormation(formation: FormationData, characterId: string): FormationData {
  return {
    ...formation,
    slots: formation.slots.filter((slot) => slot.characterId !== characterId),
  };
}

export function getBarracksDismissState(params: {
  hasActiveRun: boolean;
  rosterCount: number;
  targetExists: boolean;
}): BarracksDismissState {
  if (!params.targetExists) {
    return {
      canDismiss: false,
      reason: 'missing-character',
    };
  }

  if (params.hasActiveRun) {
    return {
      canDismiss: false,
      reason: 'run-active',
      helperLabel: '런 진행 중에는 방출할 수 없습니다',
    };
  }

  if (params.rosterCount <= 4) {
    return {
      canDismiss: false,
      reason: 'minimum-roster',
      helperLabel: '최소 4명의 멤버는 유지해야 합니다',
    };
  }

  return {
    canDismiss: true,
  };
}

export function dismissCharacterFromState(state: BarracksDismissableState, characterId: string): BarracksDismissResult {
  const characterExists = state.characters.some((character) => character.id === characterId);
  if (!characterExists) {
    return {
      dismissed: false,
      nextState: {
        characters: state.characters,
        formation: state.formation,
        presets: state.presets,
      },
    };
  }

  return {
    dismissed: true,
    nextState: {
      characters: state.characters.filter((character) => character.id !== characterId),
      formation: removeCharacterFromFormation(state.formation, characterId),
      presets: state.presets.map((preset) => ({
        ...preset,
        formation: removeCharacterFromFormation(cloneFormation(preset.formation), characterId),
      })),
    },
  };
}
