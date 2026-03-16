import type { CharacterDefinition, BattleUnit, StatRange, ActionSlot, Rarity } from '../types';
import { Team, Position } from '../types';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';
import type { CharacterClass } from '../types';

let unitCounter = 0;

/**
 * 고유 ID 생성
 */
function nextId(team: Team, name: string): string {
  return `${team}_${unitCounter++}_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * 클래스 템플릿에서 CharacterDefinition 생성 (고정 스탯, 테스트/폴백용)
 */
export function createCharacterDef(
  name: string,
  characterClass: CharacterClass,
  trainingsUsed: number = 0,
  trainingPotential: number = 3,
): CharacterDefinition {
  const template = CLASS_TEMPLATES[characterClass];
  if (!template) throw new Error(`Unknown character class: ${characterClass}`);

  return {
    id: `char_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    characterClass,
    baseStats: { ...template.baseStats },
    baseActionSlots: template.baseActionSlots.map(slot => ({ ...slot })),
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

/** 희귀도별 가중치 */
const RARITY_WEIGHTS: Record<string, number> = {
  COMMON: 10,
  RARE: 3,
  EPIC: 1,
  LEGENDARY: 0.5,
};

/**
 * 가중치 기반 중복 없는 액션 슬롯 추첨
 * 순수 함수, seeded RNG 사용
 */
export function drawWeightedSlots(
  pool: ActionSlot[],
  count: number,
  rand: () => number,
): ActionSlot[] {
  const remaining = pool.map((slot, i) => ({ slot, index: i }));
  const result: ActionSlot[] = [];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, { slot }) => {
      const rarity = slot.action.rarity ?? 'COMMON';
      return sum + (RARITY_WEIGHTS[rarity] ?? 10);
    }, 0);

    let roll = rand() * totalWeight;
    let picked = remaining.length - 1; // 폴백
    for (let j = 0; j < remaining.length; j++) {
      const rarity = remaining[j].slot.action.rarity ?? 'COMMON';
      roll -= RARITY_WEIGHTS[rarity] ?? 10;
      if (roll <= 0) {
        picked = j;
        break;
      }
    }

    result.push(remaining[picked].slot);
    remaining.splice(picked, 1);
  }

  return result;
}

/**
 * 클래스 범위 내 랜덤 스탯으로 CharacterDefinition 생성 (§23.5)
 * trainingPotential도 2~5 범위에서 랜덤
 * actionPool이 있는 클래스는 랜덤 3개 추첨, 없으면 고정 baseActionSlots
 */
export function generateCharacterDef(
  name: string,
  characterClass: CharacterClass,
  seed: number,
): CharacterDefinition {
  const template = CLASS_TEMPLATES[characterClass];
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

  // actionPool이 있으면 랜덤 추첨, 없으면 기존 고정 슬롯
  const actionSlots = template.actionPool
    ? drawWeightedSlots(template.actionPool, 3, rand)
        .map(slot => ({ ...slot }))
    : template.baseActionSlots.map(slot => ({ ...slot }));

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
export function createUnit(
  def: CharacterDefinition,
  team: Team,
  position: Position,
): BattleUnit {
  const baseSlots = def.baseActionSlots.map(slot => ({ ...slot }));

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
    baseActionSlots: def.baseActionSlots.map(slot => ({ ...slot })),
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
