/**
 * GameState — 게임 메타 진행 상태 관리
 * Town 중심의 영속 데이터를 메모리에 유지.
 * 향후 LocalStorage/IndexedDB 저장으로 확장.
 */
import type {
  BattleReplayEntry,
  BattlefieldProgressState,
  CharacterDefinition,
  HeroType,
  Position,
  ReplaySessionData,
  RunState,
} from '../types';
import { CharacterClass, HeroType as HT } from '../types';
import { createCharacterDef } from '../entities/UnitFactory';
import {
  applyRunResultToBattlefieldProgress,
  createInitialBattlefieldProgress,
} from '../systems/BattlefieldProgression';
import {
  createRecruitShopState as buildRecruitShopState,
  purchaseRecruitOffer,
  refreshRecruitShopState,
  shouldAutoRefreshRecruitShop,
} from '../systems/RecruitShop';
import type { RecruitShopState } from '../systems/RecruitShop';
import { dismissCharacterFromState, getBarracksDismissState } from '../systems/BarracksDismissal';
import {
  createGameStateDataFromSave,
  deleteSaveDataFromStorage,
  extractSaveData,
  getSaveDataStatus,
  hasSaveDataInStorage,
  loadSaveDataFromStorage,
  saveSaveDataToStorage,
} from '../systems/SaveSystem';
import type { SaveData, SaveDataStatus, StorageLike } from '../systems/SaveSystem';

// === 편성 슬롯 ===

export interface FormationSlot {
  characterId: string;
  position: Position;
}

export interface FormationData {
  slots: FormationSlot[]; // 출전 멤버 (최대 4)
  heroType: HeroType;
}

export interface FormationPreset {
  name: string;
  formation: FormationData;
}

// === 게임 상태 ===

export interface GameStateData {
  gold: number;
  characters: CharacterDefinition[];
  maxCharacterSlots: number;
  formation: FormationData;
  presets: FormationPreset[];
  recruitShopState: RecruitShopState;
  battlefieldProgress: BattlefieldProgressState;
  /** 진행 중인 런 상태 (런 밖이면 undefined) */
  runState?: RunState;
  /** 런 중 전투 리플레이 기록 */
  battleReplays: BattleReplayEntry[];
}

/** 초기 스타터 캐릭터 생성 — 고정 testActionSlots 사용 (일관된 초기 경험 보장) */
function createStarterCharacters(): CharacterDefinition[] {
  return [
    createCharacterDef('Aldric', CharacterClass.WARRIOR),
    createCharacterDef('Lyra', CharacterClass.ARCHER),
    createCharacterDef('Theron', CharacterClass.GUARDIAN),
    createCharacterDef('Zara', CharacterClass.CONTROLLER),
  ];
}

/** 초기 편성 (스타터 캐릭터 4명) */
function createDefaultFormation(characters: CharacterDefinition[]): FormationData {
  return {
    slots: [
      { characterId: characters[0].id, position: 'FRONT' as Position },
      { characterId: characters[2].id, position: 'FRONT' as Position },
      { characterId: characters[1].id, position: 'BACK' as Position },
      { characterId: characters[3].id, position: 'BACK' as Position },
    ],
    heroType: HT.COMMANDER,
  };
}

function createInitialState(): GameStateData {
  const characters = createStarterCharacters();
  return {
    gold: 500,
    characters,
    maxCharacterSlots: 8,
    formation: createDefaultFormation(characters),
    presets: [],
    recruitShopState: buildRecruitShopState(characters),
    battlefieldProgress: createInitialBattlefieldProgress(),
    battleReplays: [],
  };
}

/**
 * 싱글톤 게임 상태 매니저
 * Scene 간 데이터 공유를 위해 전역 인스턴스 사용
 */
export class GameStateManager {
  private state: GameStateData;

  constructor() {
    this.state = createInitialState();
  }

  // === 조회 ===

  get gold(): number {
    return this.state.gold;
  }

  get characters(): CharacterDefinition[] {
    return this.state.characters;
  }

  get formation(): FormationData {
    return this.state.formation;
  }

  get presets(): FormationPreset[] {
    return this.state.presets;
  }

  get maxCharacterSlots(): number {
    return this.state.maxCharacterSlots;
  }

  get runState(): RunState | undefined {
    return this.state.runState;
  }

  get recruitShopState(): RecruitShopState {
    return this.state.recruitShopState;
  }

  get battlefieldProgress(): BattlefieldProgressState {
    return this.state.battlefieldProgress;
  }

  get battleReplays(): BattleReplayEntry[] {
    return this.state.battleReplays;
  }

  getState(): GameStateData {
    return {
      ...createGameStateDataFromSave(extractSaveData(this.state)),
      runState: this.state.runState,
    };
  }

  /** ID로 캐릭터 찾기 */
  getCharacter(id: string): CharacterDefinition | undefined {
    return this.state.characters.find((c) => c.id === id);
  }

  /** 현재 편성에 포함된 캐릭터 ID 목록 */
  getFormationCharacterIds(): string[] {
    return this.state.formation.slots.map((s) => s.characterId);
  }

  /** 편성에 포함되지 않은 캐릭터 목록 */
  getUnassignedCharacters(): CharacterDefinition[] {
    const assigned = new Set(this.getFormationCharacterIds());
    return this.state.characters.filter((c) => !assigned.has(c.id));
  }

  // === 변경 ===

  setGold(gold: number): void {
    this.state.gold = gold;
    this.persist();
  }

  addGold(amount: number): void {
    this.state.gold += amount;
    this.persist();
  }

  setRunState(runState: RunState | undefined): void {
    this.state.runState = runState;
    // 런 종료 시 리플레이 기록 클리어
    if (!runState) {
      this.state.battleReplays = [];
    }
    this.persist();
  }

  addBattleReplay(stage: number, replayData: ReplaySessionData): void {
    this.state.battleReplays.push({ stage, replayData });
  }

  addCharacter(character: CharacterDefinition): void {
    this.state.characters.push(character);
    this.persist();
  }

  dismissCharacter(
    characterId: string,
  ): { ok: true } | { ok: false; reason: 'run-active' | 'minimum-roster' | 'missing-character' } {
    const dismissState = getBarracksDismissState({
      hasActiveRun: !!this.state.runState,
      rosterCount: this.state.characters.length,
      targetExists: this.state.characters.some((character) => character.id === characterId),
    });

    if (!dismissState.canDismiss) {
      return {
        ok: false,
        reason: dismissState.reason ?? 'missing-character',
      };
    }

    const result = dismissCharacterFromState(this.state, characterId);
    if (!result.dismissed) {
      return { ok: false, reason: 'missing-character' };
    }

    this.state.characters = result.nextState.characters;
    this.state.formation = result.nextState.formation;
    this.state.presets = result.nextState.presets;
    this.persist();
    return { ok: true };
  }

  setRecruitShopState(recruitShopState: RecruitShopState): void {
    this.state.recruitShopState = recruitShopState;
    this.persist();
  }

  refreshRecruitShop(): boolean {
    if (this.state.characters.length >= this.state.maxCharacterSlots) return false;
    if (this.state.gold < this.state.recruitShopState.refreshCost) return false;
    this.state.gold -= this.state.recruitShopState.refreshCost;
    this.state.recruitShopState = refreshRecruitShopState(this.state.recruitShopState, this.state.characters);
    this.persist();
    return true;
  }

  recruitFromShop(
    slotIndex: number,
  ): { ok: true } | { ok: false; reason: 'not-enough-gold' | 'roster-full' | 'empty-slot' } {
    const result = purchaseRecruitOffer(
      this.state.recruitShopState,
      this.state.characters,
      this.state.gold,
      this.state.maxCharacterSlots,
      slotIndex,
    );

    if (!result.ok) {
      return { ok: false, reason: result.reason };
    }

    this.state.gold = result.updatedGold;
    this.state.characters.push(result.recruitedCharacter);
    this.state.recruitShopState = result.updatedShopState;
    this.persist();
    return { ok: true };
  }

  refreshRecruitShopAfterRun(stagesCleared: number): void {
    if (!shouldAutoRefreshRecruitShop(stagesCleared)) return;
    this.state.recruitShopState = refreshRecruitShopState(this.state.recruitShopState, this.state.characters);
    this.persist();
  }

  finalizeRunMeta(runState: RunState, stagesCleared: number): void {
    this.state.gold += runState.gold;
    this.state.battlefieldProgress = applyRunResultToBattlefieldProgress(this.state.battlefieldProgress, runState);
    if (shouldAutoRefreshRecruitShop(stagesCleared)) {
      this.state.recruitShopState = refreshRecruitShopState(this.state.recruitShopState, this.state.characters);
    }
    this.state.runState = undefined;
    this.state.battleReplays = [];
    this.persist();
  }

  updateBattlefieldProgressAfterRun(runState: RunState): void {
    this.state.battlefieldProgress = applyRunResultToBattlefieldProgress(this.state.battlefieldProgress, runState);
    this.persist();
  }

  /** 캐릭터 정보 갱신 (ID 기준 교체) */
  updateCharacter(charDef: CharacterDefinition): void {
    const idx = this.state.characters.findIndex((c) => c.id === charDef.id);
    if (idx >= 0) {
      this.state.characters[idx] = charDef;
      this.persist();
    }
  }

  setFormation(formation: FormationData): void {
    this.state.formation = formation;
    this.persist();
  }

  /** 편성 슬롯에 캐릭터 배치 */
  setFormationSlot(index: number, characterId: string, position: Position): void {
    const slots = [...this.state.formation.slots];
    slots[index] = { characterId, position };
    this.state.formation = { ...this.state.formation, slots };
    this.persist();
  }

  /** 영웅 유형 변경 */
  setHeroType(heroType: HeroType): void {
    this.state.formation = { ...this.state.formation, heroType };
    this.persist();
  }

  /** 프리셋 저장 */
  savePreset(name: string): void {
    const existing = this.state.presets.findIndex((p) => p.name === name);
    const preset: FormationPreset = {
      name,
      formation: { ...this.state.formation },
    };
    if (existing >= 0) {
      this.state.presets[existing] = preset;
    } else {
      this.state.presets.push(preset);
    }
    this.persist();
  }

  /** 프리셋 불러오기 */
  loadPreset(name: string): boolean {
    const preset = this.state.presets.find((p) => p.name === name);
    if (!preset) return false;
    this.state.formation = { ...preset.formation };
    this.persist();
    return true;
  }

  deletePreset(name: string): boolean {
    const before = this.state.presets.length;
    this.state.presets = this.state.presets.filter((preset) => preset.name !== name);
    if (this.state.presets.length === before) return false;
    this.persist();
    return true;
  }

  loadSaveData(saveData: SaveData): void {
    this.state = createGameStateDataFromSave(saveData);
  }

  saveToStorage(storage?: StorageLike | null): boolean {
    return saveSaveDataToStorage(extractSaveData(this.state), storage);
  }

  loadFromStorage(storage?: StorageLike | null): boolean {
    const saveData = loadSaveDataFromStorage(storage);
    if (!saveData) return false;
    this.loadSaveData(saveData);
    return true;
  }

  hasSaveData(storage?: StorageLike | null): boolean {
    return hasSaveDataInStorage(storage);
  }

  getSaveStatus(storage?: StorageLike | null): SaveDataStatus {
    return getSaveDataStatus(storage);
  }

  deleteSaveData(storage?: StorageLike | null): boolean {
    return deleteSaveDataFromStorage(storage);
  }

  /** 상태 초기화 (디버그용) */
  reset(): void {
    this.state = createInitialState();
    this.persist();
  }

  private persist(): void {
    this.saveToStorage();
  }
}

/** 전역 게임 상태 인스턴스 */
export const gameState = new GameStateManager();
