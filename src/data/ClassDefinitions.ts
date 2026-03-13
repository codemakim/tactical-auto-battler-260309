import { CharacterClass, type Action, type ActionSlot, type Stats, type StatRange } from '../types';

interface ClassTemplate {
  characterClass: CharacterClass;
  /** 고정 기본 스탯 (테스트/폴백용). 캐릭터 생성 시에는 statRange 사용. */
  baseStats: Omit<Stats, 'maxHp'>;
  /** 캐릭터 생성 시 랜덤 범위 (§23.5) */
  statRange: StatRange;
  /** 클래스 기본 3개 액션 슬롯. 우선순위 순서 (0이 최우선). */
  baseActionSlots: ActionSlot[];
}

export const CLASS_TEMPLATES: Record<CharacterClass, ClassTemplate> = {
  [CharacterClass.WARRIOR]: {
    characterClass: CharacterClass.WARRIOR,
    baseStats: { hp: 53, atk: 12, grd: 7, agi: 6 },
    statRange: { hp: [48, 58], atk: [11, 13], grd: [6, 8], agi: [5, 7] },
    baseActionSlots: [
      // 슬롯 0: 전열에 있을 때 주력기
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
      // 슬롯 1: HP가 낮을 때 방어
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
      // 슬롯 2: 범용 폴백
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'warrior_strike',
          name: 'Strike',
          description: 'Basic attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
  },

  [CharacterClass.LANCER]: {
    characterClass: CharacterClass.LANCER,
    baseStats: { hp: 46, atk: 13, grd: 5, agi: 9 },
    statRange: { hp: [42, 50], atk: [12, 15], grd: [4, 6], agi: [8, 10] },
    baseActionSlots: [
      // 슬롯 0: 후열에서 돌격
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
      // 슬롯 1: 전열에서 찌르기
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
      // 슬롯 2: 폴백
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'lancer_thrust',
          name: 'Thrust',
          description: 'Basic thrust attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
  },

  [CharacterClass.ARCHER]: {
    characterClass: CharacterClass.ARCHER,
    baseStats: { hp: 40, atk: 13, grd: 4, agi: 10 },
    statRange: { hp: [36, 44], atk: [12, 14], grd: [3, 5], agi: [9, 12] },
    baseActionSlots: [
      // 슬롯 0: 후열 적 우선 저격
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
      // 슬롯 1: 어느 적이든 정밀 사격
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
      // 슬롯 2: 폴백 빠른 사격
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
  },

  [CharacterClass.GUARDIAN]: {
    characterClass: CharacterClass.GUARDIAN,
    baseStats: { hp: 60, atk: 8, grd: 11, agi: 4 },
    statRange: { hp: [56, 65], atk: [7, 10], grd: [10, 12], agi: [4, 5] },
    baseActionSlots: [
      // 슬롯 0: 라운드 첫 행동 시 강화 방어
      {
        condition: { type: 'FIRST_ACTION_THIS_ROUND' },
        action: {
          id: 'guardian_fortify',
          name: 'Fortify',
          description: 'Gain GRD x1.2 shield at the start of the round.',
          effects: [{ type: 'SHIELD', value: 1.2, stat: 'grd', target: 'SELF' }],
          isBasic: true,
        },
      },
      // 슬롯 1: HP 낮을 때 긴급 방어
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
      // 슬롯 2: 폴백 방패
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'guardian_shield_wall',
          name: 'Shield Wall',
          description: 'Gain GRD x1.0 shield.',
          effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: 'SELF' }],
          isBasic: true,
        },
      },
    ],
  },

  [CharacterClass.CONTROLLER]: {
    characterClass: CharacterClass.CONTROLLER,
    baseStats: { hp: 44, atk: 9, grd: 5, agi: 8 },
    statRange: { hp: [40, 48], atk: [8, 11], grd: [4, 6], agi: [7, 9] },
    baseActionSlots: [
      // 슬롯 0: 전열 적이 있으면 밀어내기 + 데미지
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
      // 슬롯 1: 후열에서 원거리 공격
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
      // 슬롯 2: 폴백
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'controller_strike',
          name: 'Strike',
          description: 'Basic attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
  },

  [CharacterClass.ASSASSIN]: {
    characterClass: CharacterClass.ASSASSIN,
    baseStats: { hp: 38, atk: 14, grd: 3, agi: 11 },
    statRange: { hp: [34, 42], atk: [13, 16], grd: [2, 4], agi: [10, 12] },
    baseActionSlots: [
      // 슬롯 0: 후열 적 우선 암살
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
      // 슬롯 1: 전열 적에 강습
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
      // 슬롯 2: 폴백 빠른 타격
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'assassin_quick_strike',
          name: 'Quick Strike',
          description: 'Basic swift attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
          isBasic: true,
        },
      },
    ],
  },
};
