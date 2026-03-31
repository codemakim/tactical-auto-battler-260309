import { beforeEach, describe, expect, it } from 'vitest';
import { GameStateManager } from '../core/GameState';
import {
  deleteSaveDataFromStorage,
  extractSaveData,
  getSaveDataStatus,
  loadSaveDataFromStorage,
  saveSaveDataToStorage,
  SAVE_STORAGE_KEY,
} from '../systems/SaveSystem';
import { CharacterClass, HeroType, Position, RunStatus } from '../types';
import { createCharacterDef } from '../entities/UnitFactory';

interface MemoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
}

function createMemoryStorage(): MemoryStorage {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

describe('SaveSystem', () => {
  let gameState: GameStateManager;
  let storage: MemoryStorage;

  beforeEach(() => {
    gameState = new GameStateManager();
    storage = createMemoryStorage();
  });

  it('SaveData에는 런 진행도까지 포함되고 battleReplays는 제외된다', () => {
    gameState.setGold(777);
    gameState.setHeroType(HeroType.MAGE);
    gameState.setRunState({
      currentStage: 2,
      maxStages: 5,
      seed: 99,
      party: gameState.characters.slice(0, 2),
      cardInventory: [],
      equippedCards: {},
      gold: 50,
      retryAvailable: true,
      status: RunStatus.IN_PROGRESS,
      preRunPartySnapshot: gameState.characters.slice(0, 2),
    });

    const saveData = extractSaveData(gameState.getState());

    expect(saveData.gold).toBe(777);
    expect(saveData.formation.heroType).toBe(HeroType.MAGE);
    expect(saveData.runState).toMatchObject({
      currentStage: 2,
      maxStages: 5,
      seed: 99,
      gold: 50,
      retryAvailable: true,
      status: RunStatus.IN_PROGRESS,
    });
    expect('battleReplays' in saveData).toBe(false);
  });

  it('저장 후 로드하면 런 진행도를 포함한 영속 상태가 복원된다', () => {
    const extra = createCharacterDef('Guest', CharacterClass.GUARDIAN, 1, 4);
    gameState.addGold(123);
    gameState.addCharacter(extra);
    gameState.setFormation({
      slots: [
        { characterId: extra.id, position: Position.FRONT },
        { characterId: gameState.characters[0].id, position: Position.BACK },
      ],
      heroType: HeroType.SUPPORT,
    });
    gameState.savePreset('alpha');
    gameState.setRunState({
      currentStage: 3,
      maxStages: 5,
      seed: 777,
      party: gameState.characters.slice(0, 4),
      cardInventory: [
        {
          instanceId: 'card-1',
          templateId: 'temp-1',
          action: {
            id: 'action-1',
            name: 'Test Action',
            description: 'desc',
            effects: [
              {
                type: 'DAMAGE',
                value: 1.2,
                stat: 'atk',
                target: { side: 'ENEMY', position: 'FRONT', select: 'FIRST' },
              },
            ],
          },
          rarity: 'COMMON',
        },
      ],
      equippedCards: { [gameState.characters[0].id]: { 0: 'card-1' } },
      gold: 45,
      retryAvailable: false,
      status: RunStatus.IN_PROGRESS,
      preRunPartySnapshot: gameState.characters.slice(0, 4),
    });

    saveSaveDataToStorage(extractSaveData(gameState.getState()), storage);

    const loaded = loadSaveDataFromStorage(storage);
    expect(loaded).not.toBeNull();

    const restored = new GameStateManager();
    restored.loadSaveData(loaded!);

    expect(restored.gold).toBe(gameState.gold);
    expect(restored.characters.map((c) => c.id)).toEqual(gameState.characters.map((c) => c.id));
    expect(restored.formation).toEqual(gameState.formation);
    expect(restored.presets).toEqual(gameState.presets);
    expect(restored.runState).toEqual(gameState.runState);
    expect(restored.battleReplays).toEqual([]);
  });

  it('잘못된 JSON이면 null을 반환한다', () => {
    storage.setItem(SAVE_STORAGE_KEY, '{bad json');
    expect(loadSaveDataFromStorage(storage)).toBeNull();
  });

  it('저장 데이터가 없으면 loadFromStorage는 false', () => {
    expect(gameState.loadFromStorage(storage)).toBe(false);
  });

  it('saveToStorage/loadFromStorage helper로 GameStateManager round-trip 가능', () => {
    gameState.setGold(888);
    gameState.setHeroType(HeroType.SUPPORT);
    gameState.savePreset('roundtrip');
    gameState.setRunState({
      currentStage: 2,
      maxStages: 5,
      seed: 444,
      party: gameState.characters.slice(0, 4),
      cardInventory: [],
      equippedCards: {},
      gold: 12,
      retryAvailable: true,
      status: RunStatus.IN_PROGRESS,
      preRunPartySnapshot: gameState.characters.slice(0, 4),
    });

    expect(gameState.saveToStorage(storage)).toBe(true);

    const restored = new GameStateManager();
    expect(restored.loadFromStorage(storage)).toBe(true);
    expect(restored.gold).toBe(888);
    expect(restored.formation.heroType).toBe(HeroType.SUPPORT);
    expect(restored.presets.map((p) => p.name)).toContain('roundtrip');
    expect(restored.runState).toMatchObject({
      currentStage: 2,
      seed: 444,
      gold: 12,
      status: RunStatus.IN_PROGRESS,
    });
  });

  it('같은 이름으로 저장하면 프리셋을 덮어쓴다', () => {
    const firstChar = gameState.characters[0];
    const secondChar = gameState.characters[1];

    gameState.setFormation({
      slots: [{ characterId: firstChar.id, position: Position.FRONT }],
      heroType: HeroType.COMMANDER,
    });
    gameState.savePreset('alpha');

    gameState.setFormation({
      slots: [{ characterId: secondChar.id, position: Position.BACK }],
      heroType: HeroType.MAGE,
    });
    gameState.savePreset('alpha');

    expect(gameState.presets).toHaveLength(1);
    expect(gameState.presets[0].formation.heroType).toBe(HeroType.MAGE);
    expect(gameState.presets[0].formation.slots[0]).toEqual({ characterId: secondChar.id, position: Position.BACK });
  });

  it('프리셋 삭제가 가능하다', () => {
    gameState.savePreset('alpha');
    gameState.savePreset('beta');

    expect(gameState.deletePreset('alpha')).toBe(true);
    expect(gameState.presets.map((preset) => preset.name)).toEqual(['beta']);
    expect(gameState.deletePreset('missing')).toBe(false);
  });

  it('저장 삭제가 가능하다', () => {
    expect(gameState.saveToStorage(storage)).toBe(true);
    expect(storage.getItem(SAVE_STORAGE_KEY)).not.toBeNull();

    expect(deleteSaveDataFromStorage(storage)).toBe(true);
    expect(storage.getItem(SAVE_STORAGE_KEY)).toBeNull();
  });

  it('손상된 저장 데이터는 corrupted 상태로 구분된다', () => {
    expect(getSaveDataStatus(storage)).toBe('empty');

    storage.setItem(SAVE_STORAGE_KEY, '{bad json');
    expect(getSaveDataStatus(storage)).toBe('corrupted');

    storage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ version: 999 }));
    expect(getSaveDataStatus(storage)).toBe('corrupted');
  });
});
