import { CharacterClass, Rarity, BuffType, type Action, type ActionSlot, type Stats, type StatRange } from '../types';

export interface ClassTemplate {
  characterClass: string;
  /** 고정 기본 스탯 (테스트/폴백용). 캐릭터 생성 시에는 statRange 사용. */
  baseStats: Omit<Stats, 'maxHp'>;
  /** 캐릭터 생성 시 랜덤 범위 (§23.5) */
  statRange: StatRange;
  /** 클래스 기본 3개 액션 슬롯. 우선순위 순서 (0이 최우선). */
  baseActionSlots: ActionSlot[];
  /** 클래스 전용 보상 액션 카드 */
  classActions: Action[];
}

/**
 * 클래스 레지스트리 — 새 클래스 추가 시 여기에 한 블록만 추가하면 됨.
 * 다른 파일 수정 불필요.
 */
export const CLASS_TEMPLATES: Record<string, ClassTemplate> = {
  [CharacterClass.WARRIOR]: {
    characterClass: CharacterClass.WARRIOR,
    baseStats: { hp: 53, atk: 12, grd: 7, agi: 6 },
    statRange: { hp: [48, 58], atk: [11, 13], grd: [6, 8], agi: [5, 7] },
    baseActionSlots: [
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'warrior_shield_bash',
          name: 'Shield Bash',
          description: 'Deal ATK x1.2 damage and gain GRD x0.8 shield.',
          effects: [
            { type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_FRONT' },
            { type: 'SHIELD', value: 0.8, stat: 'grd', target: 'SELF' },
          ],
          isBasic: true,
        },
      },
      {
        condition: { type: 'HP_BELOW', value: 50 },
        action: {
          id: 'warrior_fortify',
          name: 'Fortify',
          description: 'Gain GRD x1.5 shield when health is low.',
          effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: 'SELF' }],
          isBasic: true,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'warrior_strike',
          name: 'Strike',
          description: 'Basic melee attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
    classActions: [
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
        effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: 'SELF' }],
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.WARRIOR,
      },
    ],
  },

  [CharacterClass.LANCER]: {
    characterClass: CharacterClass.LANCER,
    baseStats: { hp: 46, atk: 13, grd: 5, agi: 9 },
    statRange: { hp: [42, 50], atk: [12, 15], grd: [4, 6], agi: [8, 10] },
    baseActionSlots: [
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'lancer_charge',
          name: 'Charge',
          description: 'Rush forward and deal ATK x1.4 damage. Pushes enemy back.',
          effects: [
            { type: 'MOVE', target: 'SELF', position: 'FRONT' },
            { type: 'DAMAGE', value: 1.4, stat: 'atk', target: 'ENEMY_FRONT' },
            { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
          ],
          isBasic: true,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'lancer_lance_strike',
          name: 'Lance Strike',
          description: 'Deal ATK x1.2 damage from the front.',
          effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'lancer_thrust',
          name: 'Thrust',
          description: 'Basic thrust attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
    classActions: [
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
    ],
  },

  [CharacterClass.ARCHER]: {
    characterClass: CharacterClass.ARCHER,
    baseStats: { hp: 40, atk: 13, grd: 4, agi: 10 },
    statRange: { hp: [36, 44], atk: [12, 14], grd: [3, 5], agi: [9, 12] },
    baseActionSlots: [
      {
        condition: { type: 'ENEMY_BACK_EXISTS' },
        action: {
          id: 'archer_aimed_shot',
          name: 'Aimed Shot',
          description: 'Deal ATK x1.5 damage to a back-row enemy.',
          effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: 'ENEMY_BACK' }],
          isBasic: true,
        },
      },
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'archer_precise_shot',
          name: 'Precise Shot',
          description: 'Deal ATK x1.3 damage to any enemy.',
          effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: 'ENEMY_ANY' }],
          isBasic: true,
        },
      },
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'archer_quick_shot',
          name: 'Quick Shot',
          description: 'Basic ranged attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_ANY' }],
          isBasic: true,
        },
      },
    ],
    classActions: [
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
          { type: 'DEBUFF', value: 2, stat: 'grd', target: 'ENEMY_ANY' },
        ],
        rarity: Rarity.EPIC,
        classRestriction: CharacterClass.ARCHER,
      },
    ],
  },

  [CharacterClass.GUARDIAN]: {
    characterClass: CharacterClass.GUARDIAN,
    baseStats: { hp: 60, atk: 8, grd: 11, agi: 4 },
    statRange: { hp: [56, 65], atk: [7, 10], grd: [10, 12], agi: [4, 5] },
    baseActionSlots: [
      // 슬롯 0: 후열일 때 전열 복귀 + 실드 + 커버 모드
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'guardian_advance_guard',
          name: 'Advance Guard',
          description: 'Move to front, gain GRD x1.2 shield, and enter cover mode.',
          effects: [
            { type: 'MOVE', target: 'SELF', position: 'FRONT' },
            { type: 'SHIELD', value: 1.2, stat: 'grd', target: 'SELF' },
            { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: 'SELF' },
          ],
          isBasic: true,
        },
      },
      // 슬롯 1: 전열에서 자기 방어 + 아군 실드 + 커버 모드
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'guardian_shield_wall',
          name: 'Shield Wall',
          description: 'Gain GRD x1.0 shield, shield lowest HP ally for GRD x0.8, and enter cover mode.',
          effects: [
            { type: 'SHIELD', value: 1.0, stat: 'grd', target: 'SELF' },
            { type: 'SHIELD', value: 0.8, stat: 'grd', target: 'ALLY_LOWEST_HP' },
            { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: 'SELF' },
          ],
          isBasic: true,
        },
      },
      // 슬롯 2: HP 위급 시 긴급 방어
      {
        condition: { type: 'HP_BELOW', value: 50 },
        action: {
          id: 'guardian_heavy_shield',
          name: 'Heavy Shield',
          description: 'Emergency GRD x1.5 shield when low on health.',
          effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: 'SELF' }],
          isBasic: true,
        },
      },
    ],
    classActions: [
      {
        id: 'guardian_taunt_slam',
        name: 'Taunt Slam',
        description: 'Deal minor damage and shield an ally.',
        effects: [
          { type: 'DAMAGE', value: 0.7, stat: 'atk', target: 'ENEMY_FRONT' },
          { type: 'SHIELD', value: 0.8, stat: 'grd', target: 'ALLY_LOWEST_HP' },
        ],
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.GUARDIAN,
      },
      {
        id: 'guardian_aegis',
        name: 'Aegis',
        description: 'Gain a very large shield.',
        effects: [{ type: 'SHIELD', value: 2.0, stat: 'grd', target: 'SELF' }],
        rarity: Rarity.EPIC,
        classRestriction: CharacterClass.GUARDIAN,
      },
    ],
  },

  [CharacterClass.CONTROLLER]: {
    characterClass: CharacterClass.CONTROLLER,
    baseStats: { hp: 44, atk: 9, grd: 5, agi: 8 },
    statRange: { hp: [40, 48], atk: [8, 11], grd: [4, 6], agi: [7, 9] },
    baseActionSlots: [
      {
        condition: { type: 'ENEMY_FRONT_EXISTS' },
        action: {
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
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'controller_tactical_shot',
          name: 'Tactical Shot',
          description: 'Deal ATK x1.1 damage from range.',
          effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: 'ENEMY_ANY' }],
          isBasic: true,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'controller_strike',
          name: 'Strike',
          description: 'Basic melee attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
    classActions: [
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
    ],
  },

  [CharacterClass.ASSASSIN]: {
    characterClass: CharacterClass.ASSASSIN,
    baseStats: { hp: 38, atk: 14, grd: 3, agi: 11 },
    statRange: { hp: [34, 42], atk: [13, 16], grd: [2, 4], agi: [10, 12] },
    baseActionSlots: [
      {
        condition: { type: 'ENEMY_BACK_EXISTS' },
        action: {
          id: 'assassin_backstab',
          name: 'Backstab',
          description: 'Deal ATK x1.5 damage to a back-row enemy.',
          effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: 'ENEMY_BACK' }],
          isBasic: true,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'assassin_gut_strike',
          name: 'Gut Strike',
          description: 'Deal ATK x1.2 damage from the front.',
          effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'assassin_quick_strike',
          name: 'Quick Strike',
          description: 'Basic swift attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
    classActions: [
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
    ],
  },
};

/** 등록된 모든 클래스 키 목록 */
export function getAvailableClasses(): string[] {
  return Object.keys(CLASS_TEMPLATES);
}
