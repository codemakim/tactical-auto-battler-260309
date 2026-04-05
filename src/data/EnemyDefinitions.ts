/**
 * 적 아키타입 정의 + 스테이지별 인카운터 편성
 * enemy-encounter-spec.md 기반
 */

import {
  EnemyArchetype,
  ARCHETYPE_CLASS_MAP,
  Position,
  BuffType,
  Target,
  Rarity,
  type EnemyArchetypeDefinition,
} from '../types';

// ═══════════════════════════════════════════
// 아키타입 정의 (4종, 고정 행동셋)
// ═══════════════════════════════════════════

export const ENEMY_ARCHETYPE_DEFINITIONS: Record<EnemyArchetype, EnemyArchetypeDefinition> = {
  [EnemyArchetype.BRUTE]: {
    archetype: EnemyArchetype.BRUTE,
    name: 'Brute',
    baseClass: ARCHETYPE_CLASS_MAP[EnemyArchetype.BRUTE],
    defaultPosition: Position.FRONT,
    actionSlots: [
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'brute_attack',
          name: 'Slam',
          description: 'Deal ATK x1.0 damage to front enemy.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'HP_BELOW', value: 40 },
        action: {
          id: 'brute_guard',
          name: 'Brace',
          description: 'Gain GRD x1.2 shield when low HP.',
          effects: [{ type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF }],
          rarity: Rarity.COMMON,
          defensivePriority: true,
        },
      },
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'brute_advance',
          name: 'Charge Forward',
          description: 'Move to front line.',
          effects: [{ type: 'MOVE', target: Target.SELF, position: Position.FRONT }],
          rarity: Rarity.COMMON,
        },
      },
    ],
  },

  [EnemyArchetype.RANGER]: {
    archetype: EnemyArchetype.RANGER,
    name: 'Ranger',
    baseClass: ARCHETYPE_CLASS_MAP[EnemyArchetype.RANGER],
    defaultPosition: Position.BACK,
    actionSlots: [
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'ranger_snipe',
          name: 'Snipe',
          description: 'Deal ATK x1.1 damage to weakest enemy.',
          effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'ranger_quick_shot',
          name: 'Quick Shot',
          description: 'Deal ATK x0.7 damage to front enemy.',
          effects: [{ type: 'DAMAGE', value: 0.7, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'ranger_retreat',
          name: 'Fall Back',
          description: 'Move to back line.',
          effects: [{ type: 'MOVE', target: Target.SELF, position: Position.BACK }],
          rarity: Rarity.COMMON,
        },
      },
    ],
  },

  [EnemyArchetype.GUARD]: {
    archetype: EnemyArchetype.GUARD,
    name: 'Guard',
    baseClass: ARCHETYPE_CLASS_MAP[EnemyArchetype.GUARD],
    defaultPosition: Position.FRONT,
    actionSlots: [
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'guard_shield_wall',
          name: 'Shield Wall',
          description: 'Gain GRD x1.0 shield and COVER allies for 1 round.',
          effects: [
            { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
            { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: Target.SELF },
          ],
          rarity: Rarity.COMMON,
          defensivePriority: true,
        },
      },
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'guard_advance',
          name: 'Advance',
          description: 'Move to front line.',
          effects: [{ type: 'MOVE', target: Target.SELF, position: Position.FRONT }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'guard_brace',
          name: 'Brace',
          description: 'Gain GRD x0.8 shield.',
          effects: [{ type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF }],
          rarity: Rarity.COMMON,
          defensivePriority: true,
        },
      },
    ],
  },

  [EnemyArchetype.DISRUPTOR]: {
    archetype: EnemyArchetype.DISRUPTOR,
    name: 'Disruptor',
    baseClass: ARCHETYPE_CLASS_MAP[EnemyArchetype.DISRUPTOR],
    defaultPosition: Position.FRONT,
    actionSlots: [
      {
        condition: { type: 'ENEMY_FRONT_EXISTS' },
        action: {
          id: 'disruptor_push_strike',
          name: 'Push Strike',
          description: 'Deal ATK x0.6 damage and push enemy back.',
          effects: [
            { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
            { type: 'PUSH', target: Target.ENEMY_FRONT, position: Position.BACK },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'disruptor_poke',
          name: 'Poke',
          description: 'Deal ATK x0.8 damage from back.',
          effects: [{ type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'disruptor_guard',
          name: 'Brace',
          description: 'Gain GRD x0.8 shield.',
          effects: [{ type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF }],
          rarity: Rarity.COMMON,
          defensivePriority: true,
        },
      },
    ],
  },
};

// ═══════════════════════════════════════════
// 스테이지별 적 이름 접두어
// ═══════════════════════════════════════════

export function getEnemyDisplayName(archetype: EnemyArchetype, stage: number, isBoss: boolean): string {
  const baseName = ENEMY_ARCHETYPE_DEFINITIONS[archetype].name;
  if (isBoss) return `Boss ${baseName}`;
  if (stage >= 3) return `Veteran ${baseName}`;
  return baseName;
}
