import type { GameStateData, FormationData, FormationPreset } from '../core/GameState';
import { createRecruitShopState } from './RecruitShop';
import type { RecruitShopState } from './RecruitShop';
import type { Action, CardInstance, CharacterDefinition, RunState } from '../types';

export const SAVE_STORAGE_KEY = 'tactical-auto-battler.save.v1';
export const SAVE_DATA_VERSION = 1 as const;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export type SaveDataStatus = 'empty' | 'valid' | 'corrupted';

export interface SaveData {
  version: typeof SAVE_DATA_VERSION;
  gold: number;
  characters: CharacterDefinition[];
  maxCharacterSlots: number;
  formation: FormationData;
  presets: FormationPreset[];
  recruitShopState?: RecruitShopState;
  runState?: RunState;
}

function cloneAction(action: Action): Action {
  return {
    ...action,
    effects: action.effects.map((effect) => ({
      ...effect,
      target: effect.target ? { ...effect.target } : undefined,
      swapTarget: effect.swapTarget ? { ...effect.swapTarget } : undefined,
    })),
  };
}

function cloneCharacter(char: CharacterDefinition): CharacterDefinition {
  return {
    ...char,
    baseStats: { ...char.baseStats },
    baseActionSlots: char.baseActionSlots.map((slot) => ({
      condition: { ...slot.condition },
      action: cloneAction(slot.action),
    })),
  };
}

function cloneCardInstance(card: CardInstance): CardInstance {
  return {
    ...card,
    action: cloneAction(card.action),
  };
}

function cloneRunState(runState: RunState): RunState {
  return {
    ...runState,
    party: runState.party.map(cloneCharacter),
    cardInventory: runState.cardInventory.map(cloneCardInstance),
    equippedCards: Object.fromEntries(
      Object.entries(runState.equippedCards).map(([characterId, slots]) => [
        characterId,
        Object.fromEntries(Object.entries(slots).map(([slotIndex, instanceId]) => [Number(slotIndex), instanceId])),
      ]),
    ),
    preRunPartySnapshot: runState.preRunPartySnapshot.map(cloneCharacter),
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

function cloneRecruitShopState(recruitShopState: RecruitShopState): RecruitShopState {
  return {
    refreshCost: recruitShopState.refreshCost,
    nextRotationOffset: recruitShopState.nextRotationOffset,
    offers: recruitShopState.offers.map((offer) => ({
      slotIndex: offer.slotIndex,
      price: offer.price,
      character: offer.character ? cloneCharacter(offer.character) : null,
    })),
  };
}

export function extractSaveData(state: GameStateData): SaveData {
  return {
    version: SAVE_DATA_VERSION,
    gold: state.gold,
    characters: state.characters.map(cloneCharacter),
    maxCharacterSlots: state.maxCharacterSlots,
    formation: cloneFormation(state.formation),
    presets: clonePresets(state.presets),
    recruitShopState: cloneRecruitShopState(state.recruitShopState),
    runState: state.runState ? cloneRunState(state.runState) : undefined,
  };
}

export function createGameStateDataFromSave(saveData: SaveData): GameStateData {
  const clonedCharacters = saveData.characters.map(cloneCharacter);
  return {
    gold: saveData.gold,
    characters: clonedCharacters,
    maxCharacterSlots: saveData.maxCharacterSlots,
    formation: cloneFormation(saveData.formation),
    presets: clonePresets(saveData.presets),
    recruitShopState: saveData.recruitShopState
      ? cloneRecruitShopState(saveData.recruitShopState)
      : createRecruitShopState(clonedCharacters),
    runState: saveData.runState ? cloneRunState(saveData.runState) : undefined,
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

export function getSaveDataStatus(storage: StorageLike | null = getDefaultStorage()): SaveDataStatus {
  if (!storage) return 'empty';
  const raw = storage.getItem(SAVE_STORAGE_KEY);
  if (!raw) return 'empty';
  return loadSaveDataFromStorage(storage) ? 'valid' : 'corrupted';
}

export function deleteSaveDataFromStorage(storage: StorageLike | null = getDefaultStorage()): boolean {
  if (!storage?.removeItem) return false;
  storage.removeItem(SAVE_STORAGE_KEY);
  return true;
}
