import type { FormationPreset } from '../core/GameState';

export interface FormationPresetSlotViewModel {
  index: number;
  name: string;
  filled: boolean;
  preset?: FormationPreset;
}

export const FORMATION_PRESET_SLOT_COUNT = 3;

export function getFormationPresetSlotName(index: number): string {
  return `Preset ${index + 1}`;
}

export function getFormationPresetSlots(presets: FormationPreset[]): FormationPresetSlotViewModel[] {
  return Array.from({ length: FORMATION_PRESET_SLOT_COUNT }, (_, index) => {
    const name = getFormationPresetSlotName(index);
    const preset = presets.find((candidate) => candidate.name === name);
    return {
      index,
      name,
      filled: !!preset,
      preset,
    };
  });
}
