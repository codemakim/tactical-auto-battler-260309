import { CharacterClass, Rarity, BuffType, Target, type Action, type ActionSlot, type Stats, type StatRange, type CardTemplate } from '../types';

export interface ClassTemplate {
  characterClass: string;
  /** 고정 기본 스탯 (테스트/폴백용). 캐릭터 생성 시에는 statRange 사용. */
  baseStats: Omit<Stats, 'maxHp'>;
  /** 캐릭터 생성 시 랜덤 범위 (§23.5) */
  statRange: StatRange;
  /** 클래스 기본 3개 액션 슬롯. 우선순위 순서 (0이 최우선). */
  baseActionSlots: ActionSlot[];
  /** 카드 변형 템플릿 — 보상 시 랜덤 변형 생성 */
  cardTemplates: CardTemplate[];
}

/**
 * 클래스 레지스트리 — 새 클래스 추가 시 여기에 한 블록만 추가하면 됨.
 * 다른 파일 수정 불필요.
 */
// === 전사 액션 상수 (baseActionSlots + cardTemplates에서 공유) ===

const WARRIOR_SHIELD_BASH: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_shield_bash',
    name: 'Shield Bash',
    description: 'Deal ATK x1.2 damage and gain GRD x0.8 shield.',
    effects: [
      { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
    ],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_FORTIFY: ActionSlot = {
  condition: { type: 'HP_BELOW', value: 50 },
  action: {
    id: 'warrior_fortify',
    name: 'Fortify',
    description: 'Gain GRD x1.5 shield when health is low.',
    effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_strike',
    name: 'Strike',
    description: 'Basic melee attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_IRON_WALL: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_iron_wall',
    name: 'Iron Wall',
    description: 'Raise a sturdy shield while holding the front line.',
    effects: [{ type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF }],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.WARRIOR,
  },
};

const WARRIOR_ADVANCE: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'warrior_advance',
    name: 'Advance',
    description: 'Move to the front line.',
    effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_HOLD_GROUND: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_hold_ground',
    name: 'Hold Ground',
    description: 'Brace at the front and gain GRD x1.0 shield.',
    effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_HEAVY_SLAM: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_heavy_slam',
    name: 'Heavy Slam',
    description: 'A powerful blow dealing ATK x1.4 damage.',
    effects: [{ type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.WARRIOR,
  },
};

const WARRIOR_DRIVING_BLOW: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_driving_blow',
    name: 'Driving Blow',
    description: 'Deal ATK x0.9 damage and push the enemy back.',
    effects: [
      { type: 'DAMAGE', value: 0.9, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.WARRIOR,
  },
};

const WARRIOR_EXECUTION_CUT: ActionSlot = {
  condition: { type: 'ENEMY_HP_BELOW', value: 30 },
  action: {
    id: 'warrior_execution_cut',
    name: 'Execution Cut',
    description: 'Finish off a weakened front-line enemy with ATK x1.3 damage.',
    effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.WARRIOR,
  },
};

const WARRIOR_EXECUTION_CUT_RARE: ActionSlot = {
  condition: { type: 'ENEMY_HP_BELOW', value: 30 },
  action: {
    id: 'warrior_execution_cut_rare',
    name: 'Execution Cut',
    description: 'Finish off any weakened enemy with ATK x1.3 damage.',
    effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_ANY }],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.WARRIOR,
  },
};

// === 창병 액션 상수 ===

const LANCER_CHARGE: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'lancer_charge',
    name: 'Charge',
    description: 'Rush forward and deal ATK x1.4 damage. Pushes enemy back.',
    effects: [
      { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
      { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
    ],
    rarity: Rarity.COMMON,
  },
};

const LANCER_LANCE_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_lance_strike',
    name: 'Lance Strike',
    description: 'Deal ATK x1.2 damage from the front.',
    effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
  },
};

const LANCER_THRUST: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_thrust',
    name: 'Thrust',
    description: 'Basic thrust attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
  },
};

const LANCER_SWEEP: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_sweep',
    name: 'Sweep',
    description: 'Push enemy back and deal damage.',
    effects: [
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
    ],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.LANCER,
  },
};

const LANCER_RETREAT: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_retreat',
    name: 'Retreat',
    description: 'Fall back to set up another charge.',
    effects: [{ type: 'MOVE', target: Target.SELF, position: 'BACK' }],
    rarity: Rarity.COMMON,
  },
};

const LANCER_PIERCING_THRUST: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_piercing_thrust',
    name: 'Piercing Thrust',
    description: 'Deal ATK x1.8 damage with a devastating thrust.',
    effects: [{ type: 'DAMAGE', value: 1.8, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.LANCER,
  },
};

const LANCER_SKEWER: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_skewer',
    name: 'Skewer',
    description: 'Deal ATK x1.3 damage and push the enemy back.',
    effects: [
      { type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.LANCER,
  },
};

// === 궁수 액션 상수 ===

const ARCHER_AIMED_SHOT: ActionSlot = {
  condition: { type: 'ENEMY_BACK_EXISTS' },
  action: {
    id: 'archer_aimed_shot',
    name: 'Aimed Shot',
    description: 'Deal ATK x1.5 damage to a back-row enemy.',
    effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_BACK }],
    rarity: Rarity.COMMON,
  },
};

const ARCHER_PRECISE_SHOT: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'archer_precise_shot',
    name: 'Precise Shot',
    description: 'Deal ATK x1.3 damage to any enemy.',
    effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_ANY }],
    rarity: Rarity.COMMON,
  },
};

const ARCHER_QUICK_SHOT: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'archer_quick_shot',
    name: 'Quick Shot',
    description: 'Basic ranged attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_ANY }],
    rarity: Rarity.COMMON,
  },
};

const ARCHER_VOLLEY: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'archer_volley',
    name: 'Volley',
    description: 'Rain arrows from the back line dealing ATK x1.2 damage.',
    effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_ANY }],
    rarity: Rarity.COMMON,
  },
};

const ARCHER_EVASIVE_SHOT: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'archer_evasive_shot',
    name: 'Evasive Shot',
    description: 'Fire a quick shot and fall back.',
    effects: [
      { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'MOVE', target: Target.SELF, position: 'BACK' },
    ],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.ARCHER,
  },
};

const ARCHER_MULTISHOT: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'archer_multishot',
    name: 'Multishot',
    description: 'Fire multiple arrows at any enemy.',
    effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_ANY }],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.ARCHER,
  },
};

const ARCHER_POISON_ARROW: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'archer_poison_arrow',
    name: 'Poison Arrow',
    description: 'Deal damage and debuff the target.',
    effects: [
      { type: 'DAMAGE', value: 0.9, stat: 'atk', target: Target.ENEMY_ANY },
      { type: 'DEBUFF', value: 2, stat: 'grd', target: Target.ENEMY_ANY },
    ],
    rarity: Rarity.EPIC,
    classRestriction: CharacterClass.ARCHER,
  },
};

// === 수호자 액션 상수 ===

const GUARDIAN_ADVANCE_GUARD: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'guardian_advance_guard',
    name: 'Advance Guard',
    description: 'Move to front, gain GRD x1.2 shield, and enter cover mode.',
    effects: [
      { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
      { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
      { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: Target.SELF },
    ],
    rarity: Rarity.COMMON,
  },
};

const GUARDIAN_SHIELD_WALL: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'guardian_shield_wall',
    name: 'Shield Wall',
    description: 'Gain GRD x1.0 shield, shield lowest HP ally for GRD x0.8, and enter cover mode.',
    effects: [
      { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
      { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
      { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: Target.SELF },
    ],
    rarity: Rarity.COMMON,
  },
};

const GUARDIAN_HEAVY_SHIELD: ActionSlot = {
  condition: { type: 'HP_BELOW', value: 50 },
  action: {
    id: 'guardian_heavy_shield',
    name: 'Heavy Shield',
    description: 'Emergency GRD x1.5 shield when low on health.',
    effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
    rarity: Rarity.COMMON,
  },
};

const GUARDIAN_BULWARK: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'guardian_bulwark',
    name: 'Bulwark',
    description: 'Raise a large shield at the front.',
    effects: [{ type: 'SHIELD', value: 1.3, stat: 'grd', target: Target.SELF }],
    rarity: Rarity.COMMON,
  },
};

const GUARDIAN_TAUNT_SLAM: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'guardian_taunt_slam',
    name: 'Taunt Slam',
    description: 'Deal minor damage and shield an ally.',
    effects: [
      { type: 'DAMAGE', value: 0.7, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.GUARDIAN,
  },
};

const GUARDIAN_RALLY_GUARD: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'guardian_rally_guard',
    name: 'Rally Guard',
    description: 'Shield self lightly and focus on protecting an ally.',
    effects: [
      { type: 'SHIELD', value: 0.6, stat: 'grd', target: Target.SELF },
      { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.ALLY_LOWEST_HP },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.GUARDIAN,
  },
};

const GUARDIAN_AEGIS: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'guardian_aegis',
    name: 'Aegis',
    description: 'Raise an immense shield at the front.',
    effects: [{ type: 'SHIELD', value: 2.0, stat: 'grd', target: Target.SELF }],
    rarity: Rarity.EPIC,
    classRestriction: CharacterClass.GUARDIAN,
  },
};

// === 제어사 액션 상수 ===

const CONTROLLER_REPOSITION: ActionSlot = {
  condition: { type: 'ENEMY_FRONT_EXISTS' },
  action: {
    id: 'controller_reposition',
    name: 'Reposition',
    description: 'Push an enemy to the back and deal minor damage.',
    effects: [
      { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
    ],
    rarity: Rarity.COMMON,
  },
};

const CONTROLLER_TACTICAL_SHOT: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'controller_tactical_shot',
    name: 'Tactical Shot',
    description: 'Deal ATK x1.1 damage from range.',
    effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
    rarity: Rarity.COMMON,
  },
};

const CONTROLLER_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'controller_strike',
    name: 'Strike',
    description: 'Basic melee attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
  },
};

const CONTROLLER_MIND_BLAST: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'controller_mind_blast',
    name: 'Mind Blast',
    description: 'Deal damage and slow the target.',
    effects: [
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_ANY },
      { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
    ],
    rarity: Rarity.COMMON,
    classRestriction: CharacterClass.CONTROLLER,
  },
};

const CONTROLLER_WITHDRAW: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'controller_withdraw',
    name: 'Withdraw',
    description: 'Fall back to a safer position.',
    effects: [{ type: 'MOVE', target: Target.SELF, position: 'BACK' }],
    rarity: Rarity.COMMON,
  },
};

const CONTROLLER_GRAVITY_PULL: ActionSlot = {
  condition: { type: 'ENEMY_BACK_EXISTS' },
  action: {
    id: 'controller_gravity_pull',
    name: 'Gravity Pull',
    description: 'Pull an enemy forward and delay their turn.',
    effects: [
      { type: 'PUSH', target: Target.ENEMY_BACK, position: 'FRONT' },
      { type: 'DELAY_TURN', value: 2, target: Target.ENEMY_BACK },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.CONTROLLER,
  },
};

const CONTROLLER_DISRUPT: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'controller_disrupt',
    name: 'Disrupt',
    description: 'Deal minor damage and heavily delay the target.',
    effects: [
      { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_ANY },
      { type: 'DELAY_TURN', value: 2, target: Target.ENEMY_ANY },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.CONTROLLER,
  },
};

// === 암살자 액션 상수 ===

const ASSASSIN_BACKSTAB: ActionSlot = {
  condition: { type: 'ENEMY_BACK_EXISTS' },
  action: {
    id: 'assassin_backstab',
    name: 'Backstab',
    description: 'Deal ATK x1.5 damage to a back-row enemy.',
    effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_BACK }],
    rarity: Rarity.COMMON,
  },
};

const ASSASSIN_GUT_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'assassin_gut_strike',
    name: 'Gut Strike',
    description: 'Deal ATK x1.2 damage from the front.',
    effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
  },
};

const ASSASSIN_QUICK_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'assassin_quick_strike',
    name: 'Quick Strike',
    description: 'Basic swift attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
    rarity: Rarity.COMMON,
  },
};

const ASSASSIN_SHADOWSTEP: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'assassin_shadowstep',
    name: 'Shadowstep',
    description: 'Slip into the front line from the shadows.',
    effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
    rarity: Rarity.COMMON,
  },
};

const ASSASSIN_VENOMOUS_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'assassin_venomous_strike',
    name: 'Venomous Strike',
    description: 'Deal damage and weaken the enemy guard.',
    effects: [
      { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'DEBUFF', buffType: BuffType.GUARD_DOWN, value: 2, duration: 2, target: Target.ENEMY_FRONT },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.ASSASSIN,
  },
};

const ASSASSIN_SWIFT_BLADE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'assassin_swift_blade',
    name: 'Swift Blade',
    description: 'Quick attack that advances your next turn.',
    effects: [
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'ADVANCE_TURN', value: 1, target: Target.SELF },
    ],
    rarity: Rarity.RARE,
    classRestriction: CharacterClass.ASSASSIN,
  },
};

const ASSASSIN_SHADOW_STRIKE: ActionSlot = {
  condition: { type: 'ENEMY_BACK_EXISTS' },
  action: {
    id: 'assassin_shadow_strike',
    name: 'Shadow Strike',
    description: 'Deal massive damage to a back-row enemy.',
    effects: [{ type: 'DAMAGE', value: 2.0, stat: 'atk', target: Target.ENEMY_BACK }],
    rarity: Rarity.EPIC,
    classRestriction: CharacterClass.ASSASSIN,
  },
};

export const CLASS_TEMPLATES: Record<string, ClassTemplate> = {
  [CharacterClass.WARRIOR]: {
    characterClass: CharacterClass.WARRIOR,
    baseStats: { hp: 53, atk: 12, grd: 7, agi: 6 },
    statRange: { hp: [48, 58], atk: [11, 13], grd: [6, 8], agi: [5, 7] },
    baseActionSlots: [
      { ...WARRIOR_SHIELD_BASH, action: { ...WARRIOR_SHIELD_BASH.action, isBasic: true } },
      { ...WARRIOR_FORTIFY, action: { ...WARRIOR_FORTIFY.action, isBasic: true } },
      { ...WARRIOR_STRIKE, action: { ...WARRIOR_STRIKE.action, isBasic: true } },
    ],
    cardTemplates: [
      // --- 기본 카드 (actionPool에서 이전) ---
      {
        id: 'warrior_shield_bash',
        name: 'Shield Bash',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2], targetPool: [Target.ENEMY_FRONT] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.8], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'warrior_fortify',
        name: 'Fortify',
        rarity: Rarity.COMMON,
        condition: { type: 'HP_BELOW', value: 50 },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.5], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'warrior_strike',
        name: 'Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'warrior_advance',
        name: 'Advance',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' },
        ],
      },
      {
        id: 'warrior_hold_ground',
        name: 'Hold Ground',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.0], targetPool: [Target.SELF] },
        ],
      },
      // --- 특수 카드 ---
      // Heavy Slam — 전열 고데미지 (RARE, 옵션 1개 = 고정)
      {
        id: 'warrior_heavy_slam',
        name: 'Heavy Slam',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.4], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      // Iron Wall — 전열 실드 (COMMON, 옵션 1개 = 고정)
      {
        id: 'warrior_iron_wall',
        name: 'Iron Wall',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.2], targetPool: [Target.SELF] },
        ],
      },
      // Driving Blow — 데미지 + PUSH (RARE, 옵션 1개 = 고정)
      {
        id: 'warrior_driving_blow',
        name: 'Driving Blow',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', stat: undefined, multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
      // Execution Cut — COMMON (전열 마무리)
      {
        id: 'warrior_execution_cut',
        name: 'Execution Cut',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'ENEMY_HP_BELOW', value: 30 },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.3], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      // Execution Cut — RARE (전체 대상 마무리)
      {
        id: 'warrior_execution_cut_rare',
        name: 'Execution Cut',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'ENEMY_HP_BELOW', value: 30 },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.3], targetPool: [Target.ENEMY_ANY] },
        ],
      },
    ],
  },

  // ─── LANCER ─────────────────────────────────────────────
  [CharacterClass.LANCER]: {
    characterClass: CharacterClass.LANCER,
    baseStats: { hp: 46, atk: 13, grd: 5, agi: 9 },
    statRange: { hp: [42, 50], atk: [12, 15], grd: [4, 6], agi: [8, 10] },
    baseActionSlots: [
      { ...LANCER_CHARGE, action: { ...LANCER_CHARGE.action, isBasic: true } },
      { ...LANCER_LANCE_STRIKE, action: { ...LANCER_LANCE_STRIKE.action, isBasic: true } },
      { ...LANCER_THRUST, action: { ...LANCER_THRUST.action, isBasic: true } },
    ],
    cardTemplates: [
      // --- 기본 카드 (actionPool에서 이전) ---
      {
        id: 'lancer_charge',
        name: 'Charge',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' },
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.4], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
      {
        id: 'lancer_lance_strike',
        name: 'Lance Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'lancer_thrust',
        name: 'Thrust',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'lancer_retreat',
        name: 'Retreat',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'BACK' },
        ],
      },
      // --- 특수 카드 ---
      {
        id: 'lancer_piercing_thrust',
        name: 'Piercing Thrust',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.LANCER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.8], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'lancer_sweep',
        name: 'Sweep',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.LANCER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
      {
        id: 'lancer_skewer',
        name: 'Skewer',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.LANCER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.3], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
    ],
  },

  // ─── ARCHER ─────────────────────────────────────────────
  [CharacterClass.ARCHER]: {
    characterClass: CharacterClass.ARCHER,
    baseStats: { hp: 40, atk: 13, grd: 4, agi: 10 },
    statRange: { hp: [36, 44], atk: [12, 14], grd: [3, 5], agi: [9, 12] },
    baseActionSlots: [
      { ...ARCHER_AIMED_SHOT, action: { ...ARCHER_AIMED_SHOT.action, isBasic: true } },
      { ...ARCHER_PRECISE_SHOT, action: { ...ARCHER_PRECISE_SHOT.action, isBasic: true } },
      { ...ARCHER_QUICK_SHOT, action: { ...ARCHER_QUICK_SHOT.action, isBasic: true } },
    ],
    cardTemplates: [
      // --- 기본 카드 (actionPool에서 이전) ---
      {
        id: 'archer_aimed_shot',
        name: 'Aimed Shot',
        rarity: Rarity.COMMON,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.5], targetPool: [Target.ENEMY_BACK] },
        ],
      },
      {
        id: 'archer_precise_shot',
        name: 'Precise Shot',
        rarity: Rarity.COMMON,
        condition: { type: 'ALWAYS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.3], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      {
        id: 'archer_quick_shot',
        name: 'Quick Shot',
        rarity: Rarity.COMMON,
        condition: { type: 'ALWAYS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      {
        id: 'archer_volley',
        name: 'Volley',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      // --- 특수 카드 ---
      {
        id: 'archer_multishot',
        name: 'Multishot',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'ALWAYS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.5], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      {
        id: 'archer_poison_arrow',
        name: 'Poison Arrow',
        rarity: Rarity.EPIC,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'ALWAYS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9], targetPool: [Target.ENEMY_ANY] },
          { type: 'DEBUFF', multiplierPool: [2], targetPool: [Target.ENEMY_ANY], buffType: 'GUARD_DOWN' },
        ],
      },
      {
        id: 'archer_evasive_shot',
        name: 'Evasive Shot',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.8], targetPool: [Target.ENEMY_FRONT] },
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'BACK' },
        ],
      },
    ],
  },

  // ─── GUARDIAN ────────────────────────────────────────────
  [CharacterClass.GUARDIAN]: {
    characterClass: CharacterClass.GUARDIAN,
    baseStats: { hp: 60, atk: 8, grd: 11, agi: 4 },
    statRange: { hp: [56, 65], atk: [7, 10], grd: [10, 12], agi: [4, 5] },
    baseActionSlots: [
      { ...GUARDIAN_ADVANCE_GUARD, action: { ...GUARDIAN_ADVANCE_GUARD.action, isBasic: true } },
      { ...GUARDIAN_SHIELD_WALL, action: { ...GUARDIAN_SHIELD_WALL.action, isBasic: true } },
      { ...GUARDIAN_HEAVY_SHIELD, action: { ...GUARDIAN_HEAVY_SHIELD.action, isBasic: true } },
    ],
    cardTemplates: [
      // --- 기본 카드 (actionPool에서 이전) ---
      {
        id: 'guardian_advance_guard',
        name: 'Advance Guard',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.2], targetPool: [Target.SELF] },
          { type: 'BUFF', multiplierPool: [0], targetPool: [Target.SELF], buffType: 'COVER', duration: 1 },
        ],
      },
      {
        id: 'guardian_shield_wall',
        name: 'Shield Wall',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.0], targetPool: [Target.SELF] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.8], targetPool: [Target.ALLY_LOWEST_HP] },
          { type: 'BUFF', multiplierPool: [0], targetPool: [Target.SELF], buffType: 'COVER', duration: 1 },
        ],
      },
      {
        id: 'guardian_heavy_shield',
        name: 'Heavy Shield',
        rarity: Rarity.COMMON,
        condition: { type: 'HP_BELOW', value: 50 },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.5], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'guardian_bulwark',
        name: 'Bulwark',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.3], targetPool: [Target.SELF] },
        ],
      },
      // --- 특수 카드 ---
      {
        id: 'guardian_taunt_slam',
        name: 'Taunt Slam',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.GUARDIAN,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.7], targetPool: [Target.ENEMY_FRONT] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.8], targetPool: [Target.ALLY_LOWEST_HP] },
        ],
      },
      {
        id: 'guardian_aegis',
        name: 'Aegis',
        rarity: Rarity.EPIC,
        classRestriction: CharacterClass.GUARDIAN,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [2.0], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'guardian_rally_guard',
        name: 'Rally Guard',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.GUARDIAN,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.6], targetPool: [Target.SELF] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.0], targetPool: [Target.ALLY_LOWEST_HP] },
        ],
      },
    ],
  },

  // ─── CONTROLLER ─────────────────────────────────────────
  [CharacterClass.CONTROLLER]: {
    characterClass: CharacterClass.CONTROLLER,
    baseStats: { hp: 44, atk: 9, grd: 5, agi: 8 },
    statRange: { hp: [40, 48], atk: [8, 11], grd: [4, 6], agi: [7, 9] },
    baseActionSlots: [
      { ...CONTROLLER_REPOSITION, action: { ...CONTROLLER_REPOSITION.action, isBasic: true } },
      { ...CONTROLLER_TACTICAL_SHOT, action: { ...CONTROLLER_TACTICAL_SHOT.action, isBasic: true } },
      { ...CONTROLLER_STRIKE, action: { ...CONTROLLER_STRIKE.action, isBasic: true } },
    ],
    cardTemplates: [
      // --- 기본 카드 (actionPool에서 이전) ---
      {
        id: 'controller_reposition',
        name: 'Reposition',
        rarity: Rarity.COMMON,
        condition: { type: 'ENEMY_FRONT_EXISTS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.6], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
      {
        id: 'controller_tactical_shot',
        name: 'Tactical Shot',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.1], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      {
        id: 'controller_strike',
        name: 'Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'controller_withdraw',
        name: 'Withdraw',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'BACK' },
        ],
      },
      // --- 특수 카드 ---
      {
        id: 'controller_gravity_pull',
        name: 'Gravity Pull',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_BACK], position: 'FRONT' },
          { type: 'DELAY_TURN', multiplierPool: [2], targetPool: [Target.ENEMY_BACK] },
        ],
      },
      {
        id: 'controller_mind_blast',
        name: 'Mind Blast',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ALWAYS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_ANY] },
          { type: 'DELAY_TURN', multiplierPool: [1], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      {
        id: 'controller_disrupt',
        name: 'Disrupt',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ALWAYS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.8], targetPool: [Target.ENEMY_ANY] },
          { type: 'DELAY_TURN', multiplierPool: [2], targetPool: [Target.ENEMY_ANY] },
        ],
      },
    ],
  },

  // ─── ASSASSIN ───────────────────────────────────────────
  [CharacterClass.ASSASSIN]: {
    characterClass: CharacterClass.ASSASSIN,
    baseStats: { hp: 38, atk: 14, grd: 3, agi: 11 },
    statRange: { hp: [34, 42], atk: [13, 16], grd: [2, 4], agi: [10, 12] },
    baseActionSlots: [
      { ...ASSASSIN_BACKSTAB, action: { ...ASSASSIN_BACKSTAB.action, isBasic: true } },
      { ...ASSASSIN_GUT_STRIKE, action: { ...ASSASSIN_GUT_STRIKE.action, isBasic: true } },
      { ...ASSASSIN_QUICK_STRIKE, action: { ...ASSASSIN_QUICK_STRIKE.action, isBasic: true } },
    ],
    cardTemplates: [
      // --- 기본 카드 (actionPool에서 이전) ---
      {
        id: 'assassin_backstab',
        name: 'Backstab',
        rarity: Rarity.COMMON,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.5], targetPool: [Target.ENEMY_BACK] },
        ],
      },
      {
        id: 'assassin_gut_strike',
        name: 'Gut Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'assassin_quick_strike',
        name: 'Quick Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'assassin_shadowstep',
        name: 'Shadowstep',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' },
        ],
      },
      // --- 특수 카드 ---
      {
        id: 'assassin_shadow_strike',
        name: 'Shadow Strike',
        rarity: Rarity.EPIC,
        classRestriction: CharacterClass.ASSASSIN,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [2.0], targetPool: [Target.ENEMY_BACK] },
        ],
      },
      {
        id: 'assassin_swift_blade',
        name: 'Swift Blade',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.ASSASSIN,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0], targetPool: [Target.ENEMY_FRONT] },
          { type: 'ADVANCE_TURN', multiplierPool: [1], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'assassin_venomous_strike',
        name: 'Venomous Strike',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.ASSASSIN,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.8], targetPool: [Target.ENEMY_FRONT] },
          { type: 'DEBUFF', multiplierPool: [2], targetPool: [Target.ENEMY_FRONT], buffType: 'GUARD_DOWN', duration: 2 },
        ],
      },
    ],
  },
};

/** 등록된 모든 클래스 키 목록 */
export function getAvailableClasses(): string[] {
  return Object.keys(CLASS_TEMPLATES);
}
