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
  /** 랜덤 액션 슬롯 추첨 풀 (설정 시 generateCharacterDef에서 사용) */
  actionPool?: ActionSlot[];
}

/**
 * 클래스 레지스트리 — 새 클래스 추가 시 여기에 한 블록만 추가하면 됨.
 * 다른 파일 수정 불필요.
 */
// === 전사 액션 상수 (actionPool + classActions에서 공유) ===

const WARRIOR_SHIELD_BASH: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_shield_bash',
    name: 'Shield Bash',
    description: 'Deal ATK x1.2 damage and gain GRD x0.8 shield.',
    effects: [
      { type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'SHIELD', value: 0.8, stat: 'grd', target: 'SELF' },
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
    effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: 'SELF' }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_strike',
    name: 'Strike',
    description: 'Basic melee attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_IRON_WALL: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_iron_wall',
    name: 'Iron Wall',
    description: 'Raise a sturdy shield while holding the front line.',
    effects: [{ type: 'SHIELD', value: 1.2, stat: 'grd', target: 'SELF' }],
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
    effects: [{ type: 'MOVE', target: 'SELF', position: 'FRONT' }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_HOLD_GROUND: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_hold_ground',
    name: 'Hold Ground',
    description: 'Brace at the front and gain GRD x1.0 shield.',
    effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: 'SELF' }],
    rarity: Rarity.COMMON,
  },
};

const WARRIOR_HEAVY_SLAM: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'warrior_heavy_slam',
    name: 'Heavy Slam',
    description: 'A powerful blow dealing ATK x1.4 damage.',
    effects: [{ type: 'DAMAGE', value: 1.4, stat: 'atk', target: 'ENEMY_FRONT' }],
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
      { type: 'DAMAGE', value: 0.9, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
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
    description: 'Finish off a weakened enemy with ATK x1.3 damage.',
    effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: 'ENEMY_ANY' }],
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
      { type: 'MOVE', target: 'SELF', position: 'FRONT' },
      { type: 'DAMAGE', value: 1.4, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
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
    effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_FRONT' }],
    rarity: Rarity.COMMON,
  },
};

const LANCER_THRUST: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_thrust',
    name: 'Thrust',
    description: 'Basic thrust attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
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
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
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
    effects: [{ type: 'MOVE', target: 'SELF', position: 'BACK' }],
    rarity: Rarity.COMMON,
  },
};

const LANCER_PIERCING_THRUST: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'lancer_piercing_thrust',
    name: 'Piercing Thrust',
    description: 'Deal ATK x1.8 damage with a devastating thrust.',
    effects: [{ type: 'DAMAGE', value: 1.8, stat: 'atk', target: 'ENEMY_FRONT' }],
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
      { type: 'DAMAGE', value: 1.3, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
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
    effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: 'ENEMY_BACK' }],
    rarity: Rarity.COMMON,
  },
};

const ARCHER_PRECISE_SHOT: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'archer_precise_shot',
    name: 'Precise Shot',
    description: 'Deal ATK x1.3 damage to any enemy.',
    effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: 'ENEMY_ANY' }],
    rarity: Rarity.COMMON,
  },
};

const ARCHER_QUICK_SHOT: ActionSlot = {
  condition: { type: 'ALWAYS' },
  action: {
    id: 'archer_quick_shot',
    name: 'Quick Shot',
    description: 'Basic ranged attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_ANY' }],
    rarity: Rarity.COMMON,
  },
};

const ARCHER_VOLLEY: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'archer_volley',
    name: 'Volley',
    description: 'Rain arrows from the back line dealing ATK x1.2 damage.',
    effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_ANY' }],
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
      { type: 'DAMAGE', value: 0.8, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'MOVE', target: 'SELF', position: 'BACK' },
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
    effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: 'ENEMY_ANY' }],
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
      { type: 'DAMAGE', value: 0.9, stat: 'atk', target: 'ENEMY_ANY' },
      { type: 'DEBUFF', value: 2, stat: 'grd', target: 'ENEMY_ANY' },
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
      { type: 'MOVE', target: 'SELF', position: 'FRONT' },
      { type: 'SHIELD', value: 1.2, stat: 'grd', target: 'SELF' },
      { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: 'SELF' },
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
      { type: 'SHIELD', value: 1.0, stat: 'grd', target: 'SELF' },
      { type: 'SHIELD', value: 0.8, stat: 'grd', target: 'ALLY_LOWEST_HP' },
      { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: 'SELF' },
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
    effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: 'SELF' }],
    rarity: Rarity.COMMON,
  },
};

const GUARDIAN_BULWARK: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'guardian_bulwark',
    name: 'Bulwark',
    description: 'Raise a large shield at the front.',
    effects: [{ type: 'SHIELD', value: 1.3, stat: 'grd', target: 'SELF' }],
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
      { type: 'DAMAGE', value: 0.7, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'SHIELD', value: 0.8, stat: 'grd', target: 'ALLY_LOWEST_HP' },
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
      { type: 'SHIELD', value: 0.6, stat: 'grd', target: 'SELF' },
      { type: 'SHIELD', value: 1.0, stat: 'grd', target: 'ALLY_LOWEST_HP' },
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
    effects: [{ type: 'SHIELD', value: 2.0, stat: 'grd', target: 'SELF' }],
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
      { type: 'DAMAGE', value: 0.6, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'PUSH', target: 'ENEMY_FRONT', position: 'BACK' },
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
    effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: 'ENEMY_ANY' }],
    rarity: Rarity.COMMON,
  },
};

const CONTROLLER_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'controller_strike',
    name: 'Strike',
    description: 'Basic melee attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
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
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_ANY' },
      { type: 'DELAY_TURN', value: 1, target: 'ENEMY_ANY' },
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
    effects: [{ type: 'MOVE', target: 'SELF', position: 'BACK' }],
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
      { type: 'PUSH', target: 'ENEMY_BACK', position: 'FRONT' },
      { type: 'DELAY_TURN', value: 2, target: 'ENEMY_BACK' },
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
      { type: 'DAMAGE', value: 0.8, stat: 'atk', target: 'ENEMY_ANY' },
      { type: 'DELAY_TURN', value: 2, target: 'ENEMY_ANY' },
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
    effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: 'ENEMY_BACK' }],
    rarity: Rarity.COMMON,
  },
};

const ASSASSIN_GUT_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'assassin_gut_strike',
    name: 'Gut Strike',
    description: 'Deal ATK x1.2 damage from the front.',
    effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: 'ENEMY_FRONT' }],
    rarity: Rarity.COMMON,
  },
};

const ASSASSIN_QUICK_STRIKE: ActionSlot = {
  condition: { type: 'POSITION_FRONT' },
  action: {
    id: 'assassin_quick_strike',
    name: 'Quick Strike',
    description: 'Basic swift attack.',
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
    rarity: Rarity.COMMON,
  },
};

const ASSASSIN_SHADOWSTEP: ActionSlot = {
  condition: { type: 'POSITION_BACK' },
  action: {
    id: 'assassin_shadowstep',
    name: 'Shadowstep',
    description: 'Slip into the front line from the shadows.',
    effects: [{ type: 'MOVE', target: 'SELF', position: 'FRONT' }],
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
      { type: 'DAMAGE', value: 0.8, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'DEBUFF', buffType: BuffType.GUARD_DOWN, value: 2, duration: 2, target: 'ENEMY_FRONT' },
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
      { type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' },
      { type: 'ADVANCE_TURN', value: 1, target: 'SELF' },
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
    effects: [{ type: 'DAMAGE', value: 2.0, stat: 'atk', target: 'ENEMY_BACK' }],
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
    actionPool: [
      WARRIOR_SHIELD_BASH,
      WARRIOR_FORTIFY,
      WARRIOR_STRIKE,
      WARRIOR_IRON_WALL,
      WARRIOR_ADVANCE,
      WARRIOR_HOLD_GROUND,
      WARRIOR_HEAVY_SLAM,
      WARRIOR_DRIVING_BLOW,
      WARRIOR_EXECUTION_CUT,
    ],
    classActions: [
      WARRIOR_HEAVY_SLAM.action,
      WARRIOR_IRON_WALL.action,
      WARRIOR_DRIVING_BLOW.action,
      WARRIOR_EXECUTION_CUT.action,
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
    actionPool: [
      LANCER_CHARGE,
      LANCER_LANCE_STRIKE,
      LANCER_THRUST,
      LANCER_SWEEP,
      LANCER_RETREAT,
      LANCER_PIERCING_THRUST,
      LANCER_SKEWER,
    ],
    classActions: [
      LANCER_PIERCING_THRUST.action,
      LANCER_SWEEP.action,
      LANCER_SKEWER.action,
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
    actionPool: [
      ARCHER_AIMED_SHOT,
      ARCHER_PRECISE_SHOT,
      ARCHER_QUICK_SHOT,
      ARCHER_VOLLEY,
      ARCHER_EVASIVE_SHOT,
      ARCHER_MULTISHOT,
      ARCHER_POISON_ARROW,
    ],
    classActions: [
      ARCHER_MULTISHOT.action,
      ARCHER_POISON_ARROW.action,
      ARCHER_EVASIVE_SHOT.action,
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
    actionPool: [
      GUARDIAN_ADVANCE_GUARD,
      GUARDIAN_SHIELD_WALL,
      GUARDIAN_HEAVY_SHIELD,
      GUARDIAN_BULWARK,
      GUARDIAN_TAUNT_SLAM,
      GUARDIAN_RALLY_GUARD,
      GUARDIAN_AEGIS,
    ],
    classActions: [
      GUARDIAN_TAUNT_SLAM.action,
      GUARDIAN_AEGIS.action,
      GUARDIAN_RALLY_GUARD.action,
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
    actionPool: [
      CONTROLLER_REPOSITION,
      CONTROLLER_TACTICAL_SHOT,
      CONTROLLER_STRIKE,
      CONTROLLER_MIND_BLAST,
      CONTROLLER_WITHDRAW,
      CONTROLLER_GRAVITY_PULL,
      CONTROLLER_DISRUPT,
    ],
    classActions: [
      CONTROLLER_GRAVITY_PULL.action,
      CONTROLLER_MIND_BLAST.action,
      CONTROLLER_DISRUPT.action,
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
    actionPool: [
      ASSASSIN_BACKSTAB,
      ASSASSIN_GUT_STRIKE,
      ASSASSIN_QUICK_STRIKE,
      ASSASSIN_SHADOWSTEP,
      ASSASSIN_VENOMOUS_STRIKE,
      ASSASSIN_SWIFT_BLADE,
      ASSASSIN_SHADOW_STRIKE,
    ],
    classActions: [
      ASSASSIN_SHADOW_STRIKE.action,
      ASSASSIN_SWIFT_BLADE.action,
      ASSASSIN_VENOMOUS_STRIKE.action,
    ],
  },
};

/** 등록된 모든 클래스 키 목록 */
export function getAvailableClasses(): string[] {
  return Object.keys(CLASS_TEMPLATES);
}
