import { CharacterClass, type Action, type Stats } from '../types';

interface ClassTemplate {
  characterClass: CharacterClass;
  baseStats: Omit<Stats, 'maxHp'>;
  basicAction: Action;
}

export const CLASS_TEMPLATES: Record<CharacterClass, ClassTemplate> = {
  [CharacterClass.WARRIOR]: {
    characterClass: CharacterClass.WARRIOR,
    baseStats: { hp: 110, atk: 20, def: 12, agi: 8 },
    basicAction: {
      id: 'warrior_shield_bash',
      name: 'Shield Bash',
      description: 'Deal ATK x1.2 damage and gain a small shield.',
      effects: [
        { type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_FRONT' },
        { type: 'SHIELD', value: 10, target: 'SELF' },
      ],
      isBasic: true,
    },
  },

  [CharacterClass.LANCER]: {
    characterClass: CharacterClass.LANCER,
    baseStats: { hp: 95, atk: 24, def: 8, agi: 12 },
    basicAction: {
      id: 'lancer_charge',
      name: 'Charge',
      description: 'Rush forward and deal ATK x1.4 damage. Pushes enemy back.',
      effects: [
        { type: 'DAMAGE', value: 1.4, stat: 'atk', target: 'ENEMY_FRONT' },
        { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
      ],
      isBasic: true,
    },
  },

  [CharacterClass.ARCHER]: {
    characterClass: CharacterClass.ARCHER,
    baseStats: { hp: 75, atk: 28, def: 5, agi: 14 },
    basicAction: {
      id: 'archer_precise_shot',
      name: 'Precise Shot',
      description: 'Deal ATK x1.3 damage to any enemy.',
      effects: [
        { type: 'DAMAGE', value: 1.3, stat: 'atk', target: 'ENEMY_ANY' },
      ],
      isBasic: true,
    },
  },

  [CharacterClass.GUARDIAN]: {
    characterClass: CharacterClass.GUARDIAN,
    baseStats: { hp: 140, atk: 12, def: 20, agi: 5 },
    basicAction: {
      id: 'guardian_fortify',
      name: 'Fortify',
      description: 'Gain a large shield and reduce incoming damage.',
      effects: [
        { type: 'SHIELD', value: 25, target: 'SELF' },
      ],
      isBasic: true,
    },
  },

  [CharacterClass.CONTROLLER]: {
    characterClass: CharacterClass.CONTROLLER,
    baseStats: { hp: 85, atk: 18, def: 10, agi: 11 },
    basicAction: {
      id: 'controller_reposition',
      name: 'Reposition',
      description: 'Push an enemy to the back and deal minor damage.',
      effects: [
        { type: 'DAMAGE', value: 0.6, stat: 'atk', target: 'ENEMY_FRONT' },
        { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
      ],
      isBasic: true,
    },
  },

  [CharacterClass.ASSASSIN]: {
    characterClass: CharacterClass.ASSASSIN,
    baseStats: { hp: 70, atk: 30, def: 4, agi: 16 },
    basicAction: {
      id: 'assassin_backstab',
      name: 'Backstab',
      description: 'Deal ATK x1.5 damage to a back-row enemy.',
      effects: [
        { type: 'DAMAGE', value: 1.5, stat: 'atk', target: 'ENEMY_BACK' },
      ],
      isBasic: true,
    },
  },
};
