import type { CharacterDefinition, BattleUnit, StatRange } from '../types';
import { Team, Position } from '../types';
import { CLASS_DEFINITIONS } from '../data/ClassDefinitions';
import { getAllTemplatesForClass } from '../data/ActionPool';
import type { CharacterClass } from '../types';
import { drawInitialCards } from '../systems/ActionCardSystem';

let unitCounter = 0;

/**
 * 고유 ID 생성
 */
function nextId(team: Team, name: string): string {
  return `${team}_${unitCounter++}_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * [테스트 전용] 고정 스탯 + 고정 액션 슬롯(testActionSlots)으로 CharacterDefinition 생성.
 * 결정론적 테스트를 위한 헬퍼 — 실제 게임에서는 generateCharacterDef()를 사용할 것.
 */
export function createCharacterDef(
  name: string,
  characterClass: CharacterClass,
  trainingsUsed: number = 0,
  trainingPotential: number = 3,
): CharacterDefinition {
  const template = CLASS_DEFINITIONS[characterClass];
  if (!template) throw new Error(`Unknown character class: ${characterClass}`);

  return {
    id: `char_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    characterClass,
    baseStats: { ...template.baseStats },
    baseActionSlots: template.testActionSlots.map((slot) => ({ ...slot })),
    trainingsUsed,
    trainingPotential,
  };
}

/**
 * 시드 기반 난수 생성기 (mulberry32)
 */
function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * min~max 범위 내 정수 랜덤 (inclusive)
 */
function randInt(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/**
 * [게임용] 클래스 범위 내 랜덤 스탯 + 카드풀에서 랜덤 3장 추첨으로 CharacterDefinition 생성 (§23.5).
 * trainingPotential도 2~5 범위에서 랜덤.
 * 시드 기반 결정론적 — 같은 시드면 같은 캐릭터가 생성된다.
 */
export function generateCharacterDef(name: string, characterClass: CharacterClass, seed: number): CharacterDefinition {
  const template = CLASS_DEFINITIONS[characterClass];
  if (!template) throw new Error(`Unknown character class: ${characterClass}`);
  const range = template.statRange;
  const rand = seededRand(seed);

  const baseStats = {
    hp: randInt(rand, range.hp[0], range.hp[1]),
    atk: randInt(rand, range.atk[0], range.atk[1]),
    grd: randInt(rand, range.grd[0], range.grd[1]),
    agi: randInt(rand, range.agi[0], range.agi[1]),
  };

  const trainingPotential = randInt(rand, 2, 5);

  // 클래스 전용 + 공용 카드 풀에서 가중치 기반 3장 추첨
  const slotSeed = seed + 1000; // 스탯 시드와 분리
  const allTemplates = getAllTemplatesForClass(characterClass);
  const actionSlots = drawInitialCards(allTemplates, 3, slotSeed);

  return {
    id: `char_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    characterClass,
    baseStats,
    baseActionSlots: actionSlots,
    trainingsUsed: 0,
    trainingPotential,
  };
}

/**
 * CharacterDefinition → BattleUnit 변환.
 * actionSlots는 baseActionSlots의 복사본으로 시작하며, 런 중 replaceActionSlot으로 교체 가능.
 * 런 리셋 시 baseActionSlots를 참조해 원래 슬롯으로 복원한다.
 */
export function createUnit(def: CharacterDefinition, team: Team, position: Position): BattleUnit {
  const baseSlots = def.baseActionSlots.map((slot) => ({ ...slot }));

  return {
    id: nextId(team, def.name),
    definitionId: def.id,
    name: def.name,
    characterClass: def.characterClass,
    team,
    position,
    stats: {
      hp: def.baseStats.hp,
      maxHp: def.baseStats.hp,
      atk: def.baseStats.atk,
      grd: def.baseStats.grd,
      agi: def.baseStats.agi,
    },
    shield: 0,
    buffs: [],
    actionSlots: baseSlots,
    baseActionSlots: def.baseActionSlots.map((slot) => ({ ...slot })),
    isAlive: true,
    hasActedThisRound: false,
    trainingsUsed: def.trainingsUsed,
    trainingPotential: def.trainingPotential,
  };
}

/**
 * 카운터 리셋 (테스트용)
 */
export function resetUnitCounter(): void {
  unitCounter = 0;
}
