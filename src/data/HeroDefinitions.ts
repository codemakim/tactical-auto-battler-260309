import { HeroType, AbilityCategory, AbilityType, Target, BuffType } from '../types';
import type { HeroAbility, HeroType as HeroTypeT } from '../types';

export interface HeroDefinition {
  heroType: HeroTypeT;
  name: string;
  description: string;
  abilities: HeroAbility[];
}

/** 모든 영웅 공통: 액션 카드 편집 능력 */
export const COMMON_EDIT_ACTION: HeroAbility = {
  id: 'common_edit_action',
  name: 'Edit Action',
  description: '아군 유닛 1명의 액션 슬롯 1개를 새 액션 카드로 교체한다.',
  effects: [],
  category: AbilityCategory.COMMON,
  abilityType: AbilityType.EDIT_ACTION,
};

/** 영웅 유형별 정의 (공통 + 고유 능력 포함) */
export const HERO_DEFINITIONS: Record<string, HeroDefinition> = {
  [HeroType.COMMANDER]: {
    heroType: HeroType.COMMANDER,
    name: 'Commander',
    description: '지휘 특화 — 아군 버프 중심',
    abilities: [
      COMMON_EDIT_ACTION,
      {
        id: 'commander_rally',
        name: 'Rally',
        description: '아군에게 ATK_UP 버프를 부여한다.',
        effects: [{ type: 'BUFF', buffType: BuffType.ATK_UP, value: 3, duration: 2, target: Target.ALLY_LOWEST_HP }],
        category: AbilityCategory.UNIQUE,
        abilityType: AbilityType.EFFECT,
      },
      {
        id: 'commander_shield_order',
        name: 'Shield Order',
        description: '아군에게 실드를 부여한다.',
        effects: [{ type: 'SHIELD', value: 20, target: Target.ALLY_LOWEST_HP }],
        category: AbilityCategory.UNIQUE,
        abilityType: AbilityType.EFFECT,
      },
    ],
  },

  [HeroType.MAGE]: {
    heroType: HeroType.MAGE,
    name: 'Mage',
    description: '직접 타격 특화 — 적 데미지/디버프 중심',
    abilities: [
      COMMON_EDIT_ACTION,
      {
        id: 'mage_fireball',
        name: 'Fireball',
        description: '적에게 직접 데미지를 가한다.',
        effects: [{ type: 'DAMAGE', value: 1.5, target: Target.ENEMY_ANY }],
        category: AbilityCategory.UNIQUE,
        abilityType: AbilityType.EFFECT,
      },
      {
        id: 'mage_weaken',
        name: 'Weaken',
        description: '적에게 ATK_DOWN 디버프를 부여한다.',
        effects: [{ type: 'DEBUFF', buffType: BuffType.ATK_DOWN, value: 3, duration: 2, target: Target.ENEMY_ANY }],
        category: AbilityCategory.UNIQUE,
        abilityType: AbilityType.EFFECT,
      },
    ],
  },

  [HeroType.SUPPORT]: {
    heroType: HeroType.SUPPORT,
    name: 'Support',
    description: '회복/지원 특화 — 힐/버프 중심',
    abilities: [
      COMMON_EDIT_ACTION,
      {
        id: 'support_heal',
        name: 'Heal',
        description: '아군을 회복한다.',
        effects: [{ type: 'HEAL', value: 15, target: Target.ALLY_LOWEST_HP }],
        category: AbilityCategory.UNIQUE,
        abilityType: AbilityType.EFFECT,
      },
      {
        id: 'support_haste',
        name: 'Haste',
        description: '아군의 턴을 앞당긴다.',
        effects: [{ type: 'ADVANCE_TURN', value: 1, target: Target.ALLY_LOWEST_HP }],
        category: AbilityCategory.UNIQUE,
        abilityType: AbilityType.EFFECT,
      },
    ],
  },
};

/** 영웅 유형으로 정의 조회 */
export function getHeroDefinition(heroType: HeroTypeT): HeroDefinition | undefined {
  return HERO_DEFINITIONS[heroType];
}
