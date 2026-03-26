/**
 * GameState — 게임 메타 진행 상태 관리
 * Town 중심의 영속 데이터를 메모리에 유지.
 * 향후 LocalStorage/IndexedDB 저장으로 확장.
 */
import type { CharacterDefinition, HeroType, Position, RunState, BattleReplayEntry, ReplaySessionData } from '../types';
import { CharacterClass, HeroType as HT } from '../types';
import { createCharacterDef } from '../entities/UnitFactory';

// === 편성 슬롯 ===

export interface FormationSlot {
  characterId: string;
  position: Position;
}

export interface FormationData {
  slots: FormationSlot[]; // 출전 멤버 (최대 3)
  reserveId?: string; // 교체 멤버 (최대 1)
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

/** 초기 편성 (스타터 캐릭터 3 + 교체 1) */
function createDefaultFormation(characters: CharacterDefinition[]): FormationData {
  return {
    slots: [
      { characterId: characters[0].id, position: 'FRONT' as Position },
      { characterId: characters[2].id, position: 'FRONT' as Position },
      { characterId: characters[1].id, position: 'BACK' as Position },
    ],
    reserveId: characters[3].id,
    heroType: HT.COMMANDER,
  };
}

/**
 * 싱글톤 게임 상태 매니저
 * Scene 간 데이터 공유를 위해 전역 인스턴스 사용
 */
export class GameStateManager {
  private state: GameStateData;

  constructor() {
    const characters = createStarterCharacters();
    this.state = {
      gold: 500,
      characters,
      maxCharacterSlots: 8,
      formation: createDefaultFormation(characters),
      presets: [],
      battleReplays: [],
    };
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

  get battleReplays(): BattleReplayEntry[] {
    return this.state.battleReplays;
  }

  /** ID로 캐릭터 찾기 */
  getCharacter(id: string): CharacterDefinition | undefined {
    return this.state.characters.find((c) => c.id === id);
  }

  /** 현재 편성에 포함된 캐릭터 ID 목록 */
  getFormationCharacterIds(): string[] {
    const ids = this.state.formation.slots.map((s) => s.characterId);
    if (this.state.formation.reserveId) {
      ids.push(this.state.formation.reserveId);
    }
    return ids;
  }

  /** 편성에 포함되지 않은 캐릭터 목록 */
  getUnassignedCharacters(): CharacterDefinition[] {
    const assigned = new Set(this.getFormationCharacterIds());
    return this.state.characters.filter((c) => !assigned.has(c.id));
  }

  // === 변경 ===

  setGold(gold: number): void {
    this.state.gold = gold;
  }

  addGold(amount: number): void {
    this.state.gold += amount;
  }

  setRunState(runState: RunState | undefined): void {
    this.state.runState = runState;
    // 런 종료 시 리플레이 기록 클리어
    if (!runState) {
      this.state.battleReplays = [];
    }
  }

  addBattleReplay(stage: number, replayData: ReplaySessionData): void {
    this.state.battleReplays.push({ stage, replayData });
  }

  addCharacter(character: CharacterDefinition): void {
    this.state.characters.push(character);
  }

  /** 캐릭터 정보 갱신 (ID 기준 교체) */
  updateCharacter(charDef: CharacterDefinition): void {
    const idx = this.state.characters.findIndex((c) => c.id === charDef.id);
    if (idx >= 0) {
      this.state.characters[idx] = charDef;
    }
  }

  setFormation(formation: FormationData): void {
    this.state.formation = formation;
  }

  /** 편성 슬롯에 캐릭터 배치 */
  setFormationSlot(index: number, characterId: string, position: Position): void {
    const slots = [...this.state.formation.slots];
    slots[index] = { characterId, position };
    this.state.formation = { ...this.state.formation, slots };
  }

  /** 교체 멤버 설정 */
  setReserve(characterId: string | undefined): void {
    this.state.formation = { ...this.state.formation, reserveId: characterId };
  }

  /** 영웅 유형 변경 */
  setHeroType(heroType: HeroType): void {
    this.state.formation = { ...this.state.formation, heroType };
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
  }

  /** 프리셋 불러오기 */
  loadPreset(name: string): boolean {
    const preset = this.state.presets.find((p) => p.name === name);
    if (!preset) return false;
    this.state.formation = { ...preset.formation };
    return true;
  }

  /** 상태 초기화 (디버그용) */
  reset(): void {
    const characters = createStarterCharacters();
    this.state = {
      gold: 500,
      characters,
      maxCharacterSlots: 8,
      formation: createDefaultFormation(characters),
      presets: [],
      battleReplays: [],
    };
  }
}

/** 전역 게임 상태 인스턴스 */
export const gameState = new GameStateManager();
