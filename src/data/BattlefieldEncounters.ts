import { EnemyArchetype, type BattlefieldId, type StageEncounter } from '../types';

export interface BattlefieldEncounterSet {
  id: BattlefieldId;
  stageEncounters: StageEncounter[];
  stageMultipliers: Record<number, number>;
  bossMultiplier: number;
}

export const BATTLEFIELD_ENCOUNTER_SETS: Record<BattlefieldId, BattlefieldEncounterSet> = {
  plains: {
    id: 'plains',
    stageEncounters: [
      {
        stage: 1,
        slots: [{ archetype: EnemyArchetype.BRUTE, count: 3 }],
      },
      {
        stage: 2,
        slots: [
          { archetype: EnemyArchetype.BRUTE, count: 1 },
          { archetype: EnemyArchetype.RANGER, count: 3 },
        ],
      },
      {
        stage: 3,
        slots: [
          { archetype: EnemyArchetype.GUARD, count: 1 },
          { archetype: EnemyArchetype.RANGER, count: 3 },
        ],
      },
      {
        stage: 4,
        slots: [
          { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
          { archetype: EnemyArchetype.BRUTE, count: 3 },
        ],
        variants: [
          [
            { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
            { archetype: EnemyArchetype.RANGER, count: 3 },
          ],
        ],
      },
      {
        stage: 5,
        slots: [
          { archetype: EnemyArchetype.BRUTE, count: 1 },
          { archetype: EnemyArchetype.GUARD, count: 1 },
          { archetype: EnemyArchetype.RANGER, count: 2 },
        ],
      },
    ],
    stageMultipliers: {
      1: 0.85,
      2: 0.95,
      3: 1.0,
      4: 1.1,
      5: 1.15,
    },
    bossMultiplier: 1.5,
  },
  dark_forest: {
    id: 'dark_forest',
    stageEncounters: [
      {
        stage: 1,
        slots: [
          { archetype: EnemyArchetype.RANGER, count: 2 },
          { archetype: EnemyArchetype.BRUTE, count: 1 },
        ],
      },
      {
        stage: 2,
        slots: [
          { archetype: EnemyArchetype.RANGER, count: 2 },
          { archetype: EnemyArchetype.GUARD, count: 1 },
        ],
      },
      {
        stage: 3,
        slots: [
          { archetype: EnemyArchetype.RANGER, count: 3 },
          { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
        ],
      },
      {
        stage: 4,
        slots: [
          { archetype: EnemyArchetype.GUARD, count: 1 },
          { archetype: EnemyArchetype.RANGER, count: 3 },
        ],
        variants: [
          [
            { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
            { archetype: EnemyArchetype.RANGER, count: 3 },
          ],
        ],
      },
      {
        stage: 5,
        slots: [
          { archetype: EnemyArchetype.RANGER, count: 2 },
          { archetype: EnemyArchetype.GUARD, count: 1 },
          { archetype: EnemyArchetype.BRUTE, count: 1 },
        ],
      },
    ],
    stageMultipliers: {
      1: 0.92,
      2: 1.0,
      3: 1.08,
      4: 1.16,
      5: 1.22,
    },
    bossMultiplier: 1.55,
  },
  ruined_fortress: {
    id: 'ruined_fortress',
    stageEncounters: [
      {
        stage: 1,
        slots: [
          { archetype: EnemyArchetype.GUARD, count: 2 },
          { archetype: EnemyArchetype.BRUTE, count: 1 },
        ],
      },
      {
        stage: 2,
        slots: [
          { archetype: EnemyArchetype.GUARD, count: 2 },
          { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
        ],
      },
      {
        stage: 3,
        slots: [
          { archetype: EnemyArchetype.GUARD, count: 2 },
          { archetype: EnemyArchetype.RANGER, count: 1 },
          { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
        ],
      },
      {
        stage: 4,
        slots: [
          { archetype: EnemyArchetype.GUARD, count: 2 },
          { archetype: EnemyArchetype.DISRUPTOR, count: 2 },
        ],
        variants: [
          [
            { archetype: EnemyArchetype.GUARD, count: 1 },
            { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
            { archetype: EnemyArchetype.RANGER, count: 2 },
          ],
        ],
      },
      {
        stage: 5,
        slots: [
          { archetype: EnemyArchetype.BRUTE, count: 1 },
          { archetype: EnemyArchetype.GUARD, count: 2 },
          { archetype: EnemyArchetype.DISRUPTOR, count: 1 },
        ],
      },
    ],
    stageMultipliers: {
      1: 0.98,
      2: 1.08,
      3: 1.16,
      4: 1.24,
      5: 1.32,
    },
    bossMultiplier: 1.65,
  },
};

export function getBattlefieldEncounterSet(id: BattlefieldId): BattlefieldEncounterSet {
  return BATTLEFIELD_ENCOUNTER_SETS[id];
}
