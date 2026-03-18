import { Rarity, Target, type Action } from '../types';

// === Universal Actions (범용, 모든 클래스 사용 가능) ===

export const UNIVERSAL_ACTIONS: Action[] = [
  {
    id: 'universal_quick_strike',
    name: 'Quick Strike',
    description: 'A fast attack dealing ATK x0.8 damage.',
    effects: [{ type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
  },
  {
    id: 'universal_guard',
    name: 'Guard',
    description: 'Brace for impact, gaining a small shield.',
    effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF }],
    rarity: Rarity.COMMON,
  },
  {
    id: 'universal_recover',
    name: 'Recover',
    description: 'Heal yourself for a small amount.',
    effects: [{ type: 'HEAL', value: 20, target: Target.SELF }],
    rarity: Rarity.COMMON,
  },
  {
    id: 'universal_rally',
    name: 'Rally',
    description: 'Heal the lowest HP ally.',
    effects: [{ type: 'HEAL', value: 15, target: Target.ALLY_LOWEST_HP }],
    rarity: Rarity.RARE,
  },
  {
    id: 'universal_feint',
    name: 'Feint',
    description: 'Deal minor damage and delay the target.',
    effects: [
      { type: 'DAMAGE', value: 0.5, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_FRONT },
    ],
    rarity: Rarity.RARE,
  },
];
