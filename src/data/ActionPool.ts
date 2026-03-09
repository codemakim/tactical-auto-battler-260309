import { CharacterClass, Rarity, type Action } from '../types';

/**
 * 액션 카드 풀 - 런 중 보상으로 획득 가능한 액션 카드들
 */

// === Universal Actions (범용, 모든 클래스 사용 가능) ===

export const UNIVERSAL_ACTIONS: Action[] = [
  {
    id: 'universal_quick_strike',
    name: 'Quick Strike',
    description: 'A fast attack dealing ATK x0.8 damage.',
    effects: [{ type: 'DAMAGE', value: 0.8, stat: 'atk', target: 'ENEMY_FRONT' }],
    rarity: Rarity.COMMON,
  },
  {
    id: 'universal_guard',
    name: 'Guard',
    description: 'Brace for impact, gaining a small shield.',
    effects: [{ type: 'SHIELD', value: 15, target: 'SELF' }],
    rarity: Rarity.COMMON,
  },
  {
    id: 'universal_recover',
    name: 'Recover',
    description: 'Heal yourself for a small amount.',
    effects: [{ type: 'HEAL', value: 20, target: 'SELF' }],
    rarity: Rarity.COMMON,
  },
  {
    id: 'universal_rally',
    name: 'Rally',
    description: 'Heal the lowest HP ally.',
    effects: [{ type: 'HEAL', value: 15, target: 'ALLY_LOWEST_HP' }],
    rarity: Rarity.RARE,
  },
  {
    id: 'universal_feint',
    name: 'Feint',
    description: 'Deal minor damage and delay the target.',
    effects: [
      { type: 'DAMAGE', value: 0.5, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'DELAY_TURN', value: 1, target: 'ENEMY_FRONT' },
    ],
    rarity: Rarity.RARE,
  },
];

// === Warrior Actions (전사 전용) ===

export const WARRIOR_ACTIONS: Action[] = [
  {
    id: 'warrior_heavy_slam',
    name: 'Heavy Slam',
    description: 'A powerful blow dealing ATK x1.6 damage.',
    effects: [{ type: 'DAMAGE', value: 1.6, stat: 'atk', target: 'ENEMY_FRONT' }],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.WARRIOR,
  },
  {
    id: 'warrior_iron_wall',
    name: 'Iron Wall',
    description: 'Gain a massive shield.',
    effects: [{ type: 'SHIELD', value: 30, target: 'SELF' }],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.WARRIOR,
  },
];

// === Lancer Actions (창병 전용) ===

export const LANCER_ACTIONS: Action[] = [
  {
    id: 'lancer_piercing_thrust',
    name: 'Piercing Thrust',
    description: 'Deal ATK x1.8 damage, ignoring some defense.',
    effects: [{ type: 'DAMAGE', value: 1.8, stat: 'atk', target: 'ENEMY_FRONT' }],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.LANCER,
  },
  {
    id: 'lancer_sweep',
    name: 'Sweep',
    description: 'Push enemy back and deal damage.',
    effects: [
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
    ],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.LANCER,
  },
];

// === Archer Actions (궁수 전용) ===

export const ARCHER_ACTIONS: Action[] = [
  {
    id: 'archer_multishot',
    name: 'Multishot',
    description: 'Fire multiple arrows at any enemy.',
    effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: 'ENEMY_ANY' }],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.ARCHER,
  },
  {
    id: 'archer_poison_arrow',
    name: 'Poison Arrow',
    description: 'Deal damage and debuff the target.',
    effects: [
      { type: 'DAMAGE', value: 0.9, stat: 'atk', target: 'ENEMY_ANY' },
      { type: 'DEBUFF', value: 2, stat: 'def', target: 'ENEMY_ANY' },
    ],
    rarity: Rarity.EPIC,
    classRestriction: CharacterClass.ARCHER,
  },
];

// === Guardian Actions (수호자 전용) ===

export const GUARDIAN_ACTIONS: Action[] = [
  {
    id: 'guardian_taunt_slam',
    name: 'Taunt Slam',
    description: 'Deal minor damage and shield an ally.',
    effects: [
      { type: 'DAMAGE', value: 0.7, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'SHIELD', value: 20, target: 'ALLY_LOWEST_HP' },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.GUARDIAN,
  },
  {
    id: 'guardian_aegis',
    name: 'Aegis',
    description: 'Gain a very large shield.',
    effects: [{ type: 'SHIELD', value: 40, target: 'SELF' }],
    rarity: Rarity.EPIC,
    classRestriction: CharacterClass.GUARDIAN,
  },
];

// === Controller Actions (제어자 전용) ===

export const CONTROLLER_ACTIONS: Action[] = [
  {
    id: 'controller_gravity_pull',
    name: 'Gravity Pull',
    description: 'Pull an enemy forward and delay their turn.',
    effects: [
      { type: 'PUSH', target: 'ENEMY_BACK', position: 'FRONT' },
      { type: 'DELAY_TURN', value: 2, target: 'ENEMY_BACK' },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.CONTROLLER,
  },
  {
    id: 'controller_mind_blast',
    name: 'Mind Blast',
    description: 'Deal damage and slow the target.',
    effects: [
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_ANY' },
      { type: 'DELAY_TURN', value: 1, target: 'ENEMY_ANY' },
    ],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.CONTROLLER,
  },
];

// === Assassin Actions (암살자 전용) ===

export const ASSASSIN_ACTIONS: Action[] = [
  {
    id: 'assassin_shadow_strike',
    name: 'Shadow Strike',
    description: 'Deal massive damage to a back-row enemy.',
    effects: [{ type: 'DAMAGE', value: 2.0, stat: 'atk', target: 'ENEMY_BACK' }],
    rarity: Rarity.EPIC,
    classRestriction: CharacterClass.ASSASSIN,
  },
  {
    id: 'assassin_swift_blade',
    name: 'Swift Blade',
    description: 'Quick attack that advances your next turn.',
    effects: [
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'ADVANCE_TURN', value: 1, target: 'SELF' },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.ASSASSIN,
  },
];

/**
 * 전체 액션 풀 (모든 액션 카드)
 */
export const ACTION_POOL: Action[] = [
  ...UNIVERSAL_ACTIONS,
  ...WARRIOR_ACTIONS,
  ...LANCER_ACTIONS,
  ...ARCHER_ACTIONS,
  ...GUARDIAN_ACTIONS,
  ...CONTROLLER_ACTIONS,
  ...ASSASSIN_ACTIONS,
];
