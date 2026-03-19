import { CharacterClass, Rarity, BuffType, Target, type ActionSlot, type Stats, type StatRange, type CardTemplate } from '../types';

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
export const CLASS_DEFINITIONS: Record<string, ClassTemplate> = {
  [CharacterClass.WARRIOR]: {
    characterClass: CharacterClass.WARRIOR,
    baseStats: { hp: 53, atk: 12, grd: 7, agi: 6 },
    statRange: { hp: [48, 58], atk: [11, 13], grd: [6, 8], agi: [5, 7] },
    baseActionSlots: [
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'warrior_shield_bash', name: 'Shield Bash', isBasic: true,
          description: 'Deal ATK x1.2 damage and gain GRD x0.8 shield.',
          effects: [
            { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
            { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'HP_BELOW', value: 50 },
        action: {
          id: 'warrior_fortify', name: 'Fortify', isBasic: true,
          description: 'Gain GRD x1.5 shield when health is low.',
          effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'warrior_strike', name: 'Strike', isBasic: true,
          description: 'Basic melee attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
    ],
    cardTemplates: [
      // --- 기본 카드 ---
      {
        id: 'warrior_shield_bash',
        name: 'Shield Bash',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.1, 1.2, 1.3], targetPool: [Target.ENEMY_FRONT] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.7, 0.8, 0.9], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'warrior_fortify',
        name: 'Fortify',
        rarity: Rarity.COMMON,
        condition: { type: 'HP_BELOW', value: 50 },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.3, 1.5, 1.7], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'warrior_strike',
        name: 'Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9, 1.0, 1.1], targetPool: [Target.ENEMY_FRONT] },
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
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.9, 1.0, 1.1], targetPool: [Target.SELF] },
        ],
      },
      // --- 특수 카드 ---
      // Heavy Slam — 전열 고데미지
      {
        id: 'warrior_heavy_slam',
        name: 'Heavy Slam',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.3, 1.4, 1.5], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      // Iron Wall — 전열 실드
      {
        id: 'warrior_iron_wall',
        name: 'Iron Wall',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.1, 1.2, 1.3], targetPool: [Target.SELF] },
        ],
      },
      // Driving Blow — 데미지 + PUSH
      {
        id: 'warrior_driving_blow',
        name: 'Driving Blow',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.WARRIOR,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.8, 0.9, 1.0], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
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
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2, 1.3, 1.4], targetPool: [Target.ENEMY_FRONT] },
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
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2, 1.3, 1.4], targetPool: [Target.ENEMY_ANY] },
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
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'lancer_charge', name: 'Charge', isBasic: true,
          description: 'Rush forward and deal ATK x1.4 damage. Pushes enemy back.',
          effects: [
            { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
            { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
            { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'lancer_lance_strike', name: 'Lance Strike', isBasic: true,
          description: 'Deal ATK x1.2 damage from the front.',
          effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'lancer_thrust', name: 'Thrust', isBasic: true,
          description: 'Basic thrust attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
    ],
    cardTemplates: [
      // --- 기본 카드 ---
      {
        id: 'lancer_charge',
        name: 'Charge',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' },
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.3, 1.4, 1.5], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
      {
        id: 'lancer_lance_strike',
        name: 'Lance Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.1, 1.2, 1.3], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'lancer_thrust',
        name: 'Thrust',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9, 1.0, 1.1], targetPool: [Target.ENEMY_FRONT] },
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
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.4, 1.5, 1.6], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'lancer_sweep',
        name: 'Sweep',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.LANCER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9, 1.0, 1.1], targetPool: [Target.ENEMY_FRONT] },
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
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2, 1.3, 1.4], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
    ],
  },

  // ─── ARCHER ─────────────────────────────────────────────
  // 설계 철학: "조건부 원거리 딜러" — BACK에서만 강하고, ALWAYS 카드 0장.
  // FRONT에 밀려나면 탈출 카드가 필수. Controller 시너지로 극대화.
  [CharacterClass.ARCHER]: {
    characterClass: CharacterClass.ARCHER,
    baseStats: { hp: 40, atk: 13, grd: 4, agi: 10 },
    statRange: { hp: [36, 44], atk: [12, 14], grd: [3, 5], agi: [9, 12] },
    baseActionSlots: [
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'archer_aimed_shot', name: 'Aimed Shot', isBasic: true,
          description: 'Deal ATK x1.3 damage to a back-row enemy from the back line.',
          effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'archer_suppressing_shot', name: 'Suppressing Shot', isBasic: true,
          description: 'Weak shot that delays enemy turn.',
          effects: [
            { type: 'DAMAGE', value: 0.7, stat: 'atk', target: Target.ENEMY_ANY },
            { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'archer_evasive_shot', name: 'Evasive Shot', isBasic: true,
          description: 'Shoot while retreating to the back line.',
          effects: [
            { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
            { type: 'MOVE', target: Target.SELF, position: 'BACK' },
          ],
          rarity: Rarity.COMMON,
        },
      },
    ],
    cardTemplates: [
      // --- BACK 카드 (4장) — 후열에서 강한 공격 ---
      {
        id: 'archer_aimed_shot',
        name: 'Aimed Shot',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2, 1.3, 1.4], targetPool: [Target.ENEMY_BACK] },
        ],
      },
      {
        id: 'archer_volley',
        name: 'Volley',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0, 1.1, 1.2], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      {
        id: 'archer_suppressing_shot',
        name: 'Suppressing Shot',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.6, 0.7, 0.8], targetPool: [Target.ENEMY_ANY] },
          { type: 'DELAY_TURN', multiplierPool: [1], targetPool: [Target.ENEMY_ANY] },
        ],
      },
      {
        id: 'archer_poison_arrow',
        name: 'Poison Arrow',
        rarity: Rarity.EPIC,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9], targetPool: [Target.ENEMY_ANY] },
          { type: 'DEBUFF', multiplierPool: [2], targetPool: [Target.ENEMY_ANY], buffType: 'GUARD_DOWN' },
        ],
      },
      // --- FRONT 카드 (3장) — 전열 탈출/대응 ---
      {
        id: 'archer_evasive_shot',
        name: 'Evasive Shot',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.7, 0.8, 0.9], targetPool: [Target.ENEMY_FRONT] },
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'BACK' },
        ],
      },
      {
        id: 'archer_disengage',
        name: 'Disengage',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'BACK' },
        ],
      },
      {
        id: 'archer_snap_shot',
        name: 'Snap Shot',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.5, 0.6, 0.7], targetPool: [Target.ENEMY_FRONT] },
          { type: 'DELAY_TURN', multiplierPool: [1], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      // --- 조건부 카드 (2장) — 상황 특화 고배율 ---
      {
        id: 'archer_snipe',
        name: 'Snipe',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.5, 1.6, 1.7], targetPool: [Target.ENEMY_BACK, Target.ENEMY_BACK_LOWEST_HP, Target.ENEMY_BACK_HIGHEST_ATK] },
        ],
      },
      {
        id: 'archer_focus_fire',
        name: 'Focus Fire',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.ARCHER,
        condition: { type: 'ENEMY_HP_BELOW', value: 30 },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.5, 1.6, 1.7], targetPool: [Target.ENEMY_ANY] },
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
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'guardian_advance_guard', name: 'Advance Guard', isBasic: true,
          description: 'Move to front, gain GRD x1.2 shield, and enter cover mode.',
          effects: [
            { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
            { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
            { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: Target.SELF },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'guardian_shield_wall', name: 'Shield Wall', isBasic: true,
          description: 'Gain GRD x1.0 shield, shield lowest HP ally for GRD x0.8, and enter cover mode.',
          effects: [
            { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
            { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
            { type: 'BUFF', buffType: BuffType.COVER, duration: 1, value: 0, target: Target.SELF },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'HP_BELOW', value: 50 },
        action: {
          id: 'guardian_heavy_shield', name: 'Heavy Shield', isBasic: true,
          description: 'Emergency GRD x1.5 shield when low on health.',
          effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
          rarity: Rarity.COMMON,
        },
      },
    ],
    cardTemplates: [
      // --- 기본 카드 ---
      {
        id: 'guardian_advance_guard',
        name: 'Advance Guard',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.0, 1.2, 1.4], targetPool: [Target.SELF] },
          { type: 'BUFF', multiplierPool: [0], targetPool: [Target.SELF], buffType: 'COVER', duration: 1 },
        ],
      },
      {
        id: 'guardian_shield_wall',
        name: 'Shield Wall',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.8, 1.0, 1.2], targetPool: [Target.SELF] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.6, 0.8, 1.0], targetPool: [Target.ALLY_LOWEST_HP] },
          { type: 'BUFF', multiplierPool: [0], targetPool: [Target.SELF], buffType: 'COVER', duration: 1 },
        ],
      },
      {
        id: 'guardian_heavy_shield',
        name: 'Heavy Shield',
        rarity: Rarity.COMMON,
        condition: { type: 'HP_BELOW', value: 50 },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.3, 1.5, 1.7], targetPool: [Target.SELF] },
        ],
      },
      {
        id: 'guardian_bulwark',
        name: 'Bulwark',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'SHIELD', stat: 'grd', multiplierPool: [1.1, 1.3, 1.5], targetPool: [Target.SELF] },
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
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.6, 0.7, 0.8], targetPool: [Target.ENEMY_FRONT] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.7, 0.8, 0.9], targetPool: [Target.ALLY_LOWEST_HP] },
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
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.5, 0.6, 0.7], targetPool: [Target.SELF] },
          { type: 'SHIELD', stat: 'grd', multiplierPool: [0.9, 1.0, 1.1], targetPool: [Target.ALLY_LOWEST_HP] },
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
      {
        condition: { type: 'ENEMY_FRONT_EXISTS' },
        action: {
          id: 'controller_reposition', name: 'Reposition', isBasic: true,
          description: 'Push an enemy to the back and deal minor damage.',
          effects: [
            { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
            { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'controller_tactical_shot', name: 'Tactical Shot', isBasic: true,
          description: 'Deal ATK x1.1 damage from range.',
          effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'controller_strike', name: 'Strike', isBasic: true,
          description: 'Basic melee attack.',
          effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
    ],
    cardTemplates: [
      // --- 기본 카드 ---
      {
        id: 'controller_reposition',
        name: 'Reposition',
        rarity: Rarity.COMMON,
        condition: { type: 'ENEMY_FRONT_EXISTS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.5, 0.6, 0.7], targetPool: [Target.ENEMY_FRONT] },
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_FRONT], position: 'BACK' },
        ],
      },
      {
        id: 'controller_tactical_shot',
        name: 'Tactical Shot',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.0, 1.1, 1.2], targetPool: [Target.ENEMY_ANY, Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'controller_strike',
        name: 'Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9, 1.0, 1.1], targetPool: [Target.ENEMY_FRONT] },
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
      // --- PULL 카드 ---
      {
        id: 'controller_gravity_pull',
        name: 'Gravity Pull',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_BACK], position: 'FRONT' },
        ],
      },
      {
        id: 'controller_expose_weakness',
        name: 'Expose Weakness',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'PUSH', multiplierPool: [0], targetPool: [Target.ENEMY_BACK_LOWEST_HP], position: 'FRONT' },
        ],
      },
      // --- SWAP 카드 ---
      {
        id: 'controller_displace',
        name: 'Displace',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'SWAP', multiplierPool: [0], targetPool: [Target.ENEMY_BACK], swapTarget: Target.ENEMY_FRONT },
        ],
      },
      {
        id: 'controller_break_formation',
        name: 'Break Formation',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ENEMY_BACK_EXISTS' },
        effectTemplates: [
          { type: 'SWAP', multiplierPool: [0], targetPool: [Target.ENEMY_BACK_HIGHEST_ATK], swapTarget: Target.ENEMY_FRONT },
        ],
      },
      // --- DELAY 카드 ---
      {
        id: 'controller_disrupt',
        name: 'Disrupt',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.5, 0.6, 0.7], targetPool: [Target.ENEMY_FRONT] },
          { type: 'DELAY_TURN', multiplierPool: [1], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'controller_mind_jolt',
        name: 'Mind Jolt',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.CONTROLLER,
        condition: { type: 'ALWAYS' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.4, 0.5, 0.6], targetPool: [Target.ENEMY_ANY] },
          { type: 'DELAY_TURN', multiplierPool: [1, 2], targetPool: [Target.ENEMY_ANY] },
        ],
      },
    ],
  },

  // ─── ASSASSIN ───────────────────────────────────────────
  // 설계 철학: "침투형 리스크 딜러" — BACK→FRONT 돌진, 높은 ATK/AGI, 낮은 HP/GRD.
  // 탈출 어려움(의도적). 들어가서 죽이거나 죽거나. Archer와 후열 제거 역할 공유하되 접근법 상반.
  [CharacterClass.ASSASSIN]: {
    characterClass: CharacterClass.ASSASSIN,
    baseStats: { hp: 38, atk: 14, grd: 3, agi: 11 },
    statRange: { hp: [34, 42], atk: [13, 16], grd: [2, 4], agi: [10, 12] },
    baseActionSlots: [
      {
        condition: { type: 'POSITION_BACK' },
        action: {
          id: 'assassin_dive', name: 'Dive', isBasic: true,
          description: 'Rush to front and strike a back-row enemy.',
          effects: [
            { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
            { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_BACK },
          ],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'POSITION_FRONT' },
        action: {
          id: 'assassin_gut_strike', name: 'Gut Strike', isBasic: true,
          description: 'Deal ATK x1.3 damage from the front.',
          effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_FRONT }],
          rarity: Rarity.COMMON,
        },
      },
      {
        condition: { type: 'HP_BELOW', value: 40 },
        action: {
          id: 'assassin_withdraw', name: 'Withdraw', isBasic: true,
          description: 'Strike and retreat when badly hurt.',
          effects: [
            { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
            { type: 'MOVE', target: Target.SELF, position: 'BACK' },
          ],
          rarity: Rarity.COMMON,
        },
      },
    ],
    cardTemplates: [
      // --- 침투 카드 (POSITION_BACK, 2장) — 후열에서 전열로 돌진 ---
      {
        id: 'assassin_dive',
        name: 'Dive',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_BACK' },
        effectTemplates: [
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'FRONT' },
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.3, 1.4, 1.5], targetPool: [Target.ENEMY_BACK] },
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
      // --- 전열 공격 카드 (POSITION_FRONT, 3장) — 침투 후 연타 ---
      {
        id: 'assassin_gut_strike',
        name: 'Gut Strike',
        rarity: Rarity.COMMON,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.2, 1.3, 1.4], targetPool: [Target.ENEMY_FRONT] },
        ],
      },
      {
        id: 'assassin_swift_blade',
        name: 'Swift Blade',
        rarity: Rarity.RARE,
        classRestriction: CharacterClass.ASSASSIN,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.9, 1.0, 1.1], targetPool: [Target.ENEMY_FRONT] },
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
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.7, 0.8, 0.9], targetPool: [Target.ENEMY_FRONT] },
          { type: 'DEBUFF', multiplierPool: [2], targetPool: [Target.ENEMY_FRONT], buffType: 'GUARD_DOWN', duration: 2 },
        ],
      },
      // --- 탈출 카드 (1장) — HP 낮을 때만 후퇴 가능 ---
      {
        id: 'assassin_withdraw',
        name: 'Withdraw',
        rarity: Rarity.COMMON,
        classRestriction: CharacterClass.ASSASSIN,
        condition: { type: 'HP_BELOW', value: 40 },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [0.7, 0.8, 0.9], targetPool: [Target.ENEMY_FRONT] },
          { type: 'MOVE', multiplierPool: [0], targetPool: [Target.SELF], position: 'BACK' },
        ],
      },
      // --- 핵심 킬 카드 (1장) — 전열에서 후열 적을 직접 처형 ---
      {
        id: 'assassin_shadow_strike',
        name: 'Shadow Strike',
        rarity: Rarity.EPIC,
        classRestriction: CharacterClass.ASSASSIN,
        condition: { type: 'POSITION_FRONT' },
        effectTemplates: [
          { type: 'DAMAGE', stat: 'atk', multiplierPool: [1.8, 1.9, 2.0], targetPool: [Target.ENEMY_BACK] },
        ],
      },
    ],
  },
};

/** 등록된 모든 클래스 키 목록 */
export function getAvailableClasses(): string[] {
  return Object.keys(CLASS_DEFINITIONS);
}
