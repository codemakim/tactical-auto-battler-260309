/**
 * 적 인카운터 생성기
 * enemy-encounter-spec.md §2~§4 기반
 *
 * generateEncounter(stage, seed) → CharacterDefinition[] + positions
 */

import type { BattlefieldId, CharacterDefinition, EncounterSlot } from '../types';
import { Position } from '../types';
import { CLASS_DEFINITIONS } from '../data/ClassDefinitions';
import { ENEMY_ARCHETYPE_DEFINITIONS, getEnemyDisplayName } from '../data/EnemyDefinitions';
import { getBattlefieldEncounterSet } from '../data/BattlefieldEncounters';

/** 생성된 적 유닛 + 포지션 정보 */
export interface EnemyUnit {
  definition: CharacterDefinition;
  position: Position;
}

/**
 * 시드 기반 난수 (mulberry32)
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
 * 스테이지별 적 인카운터 생성
 * 결정론적: 같은 stage + seed = 같은 적 편성
 */
export function generateEncounter(stage: number, seed: number, battlefieldId: BattlefieldId = 'plains'): EnemyUnit[] {
  const encounterSet = getBattlefieldEncounterSet(battlefieldId);
  const encounter = encounterSet.stageEncounters.find((entry) => entry.stage === stage);
  if (!encounter) throw new Error(`Unknown stage: ${stage}`);

  const rand = seededRand(seed);

  // Stage 4 변형 선택
  let slots: EncounterSlot[];
  if (encounter.variants && encounter.variants.length > 0) {
    const variantIdx = Math.floor(rand() * (encounter.variants.length + 1));
    slots = variantIdx === 0 ? encounter.slots : encounter.variants[variantIdx - 1];
  } else {
    slots = encounter.slots;
  }

  const baseMultiplier = encounterSet.stageMultipliers[stage] ?? 1.0;
  const enemies: EnemyUnit[] = [];
  let unitIdx = 0;

  for (const slot of slots) {
    const archDef = ENEMY_ARCHETYPE_DEFINITIONS[slot.archetype];
    const classTemplate = CLASS_DEFINITIONS[archDef.baseClass];
    if (!classTemplate) throw new Error(`Unknown base class: ${archDef.baseClass}`);

    const range = classTemplate.statRange;

    for (let i = 0; i < slot.count; i++) {
      // 보스 판정: Stage 5의 첫 번째 유닛 (Brute)
      const isBoss = stage === 5 && unitIdx === 0;
      const multiplier = isBoss ? encounterSet.bossMultiplier : baseMultiplier;

      // 스탯 중간값 × 배율 × ±10% 시드 변동
      const variation = 0.9 + rand() * 0.2;
      const hp = Math.floor(((range.hp[0] + range.hp[1]) / 2) * multiplier * variation);
      const atk = Math.floor(((range.atk[0] + range.atk[1]) / 2) * multiplier * variation);
      const grd = Math.floor(((range.grd[0] + range.grd[1]) / 2) * multiplier * variation);
      const agi = Math.floor(((range.agi[0] + range.agi[1]) / 2) * multiplier * variation);

      const displayName = getEnemyDisplayName(slot.archetype, stage, isBoss);
      const unitName = slot.count > 1 ? `${displayName} ${String.fromCharCode(65 + i)}` : displayName;

      const definition: CharacterDefinition = {
        id: `enemy_s${stage}_${slot.archetype.toLowerCase()}_${i}`,
        name: unitName,
        characterClass: `ENEMY_${slot.archetype}`,
        baseStats: { hp, atk, grd, agi },
        baseActionSlots: archDef.actionSlots.map((s) => ({ ...s })),
        trainingsUsed: 0,
        trainingPotential: 0,
      };

      enemies.push({
        definition,
        position: archDef.defaultPosition,
      });

      unitIdx++;
    }
  }

  return enemies;
}
