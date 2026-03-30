import type { GameStateData, FormationData, FormationPreset } from '../core/GameState';
import type { CharacterDefinition } from '../types';

export const SAVE_STORAGE_KEY = 'tactical-auto-battler.save.v1';
export const SAVE_DATA_VERSION = 1 as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export interface SaveData {
  version: typeof SAVE_DATA_VERSION;
  gold: number;
  characters: CharacterDefinition[];
  maxCharacterSlots: number;
  formation: FormationData;
  presets: FormationPreset[];
}

function cloneCharacter(char: CharacterDefinition): CharacterDefinition {
  return {
    ...char,
    baseStats: { ...char.baseStats },
    baseActionSlots: char.baseActionSlots.map((slot) => ({
      condition: { ...slot.condition },
      action: {
        ...slot.action,
        effects: slot.action.effects.map((effect) => ({ ...effect })),
      },
    })),
  };
}

function cloneFormation(formation: FormationData): FormationData {
  return {
    heroType: formation.heroType,
    slots: formation.slots.map((slot) => ({ ...slot })),
  };
}

function clonePresets(presets: FormationPreset[]): FormationPreset[] {
  return presets.map((preset) => ({
    name: preset.name,
    formation: cloneFormation(preset.formation),
  }));
}

export function extractSaveData(state: GameStateData): SaveData {
  return {
    version: SAVE_DATA_VERSION,
    gold: state.gold,
    characters: state.characters.map(cloneCharacter),
    maxCharacterSlots: state.maxCharacterSlots,
    formation: cloneFormation(state.formation),
    presets: clonePresets(state.presets),
  };
}

export function createGameStateDataFromSave(saveData: SaveData): GameStateData {
  return {
    gold: saveData.gold,
    characters: saveData.characters.map(cloneCharacter),
    maxCharacterSlots: saveData.maxCharacterSlots,
    formation: cloneFormation(saveData.formation),
    presets: clonePresets(saveData.presets),
    battleReplays: [],
  };
}

export function getDefaultStorage(): StorageLike | null {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) return null;
  return globalThis.localStorage as StorageLike;
}

export function hasSaveDataInStorage(storage: StorageLike | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  return storage.getItem(SAVE_STORAGE_KEY) !== null;
}

export function saveSaveDataToStorage(saveData: SaveData, storage: StorageLike | null = getDefaultStorage()): boolean {
  if (!storage) return false;
  storage.setItem(SAVE_STORAGE_KEY, JSON.stringify(saveData));
  return true;
}

export function loadSaveDataFromStorage(storage: StorageLike | null = getDefaultStorage()): SaveData | null {
  if (!storage) return null;
  const raw = storage.getItem(SAVE_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as SaveData;
    if (parsed.version !== SAVE_DATA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}
