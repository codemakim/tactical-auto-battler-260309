/**
 * 전투 시뮬레이션 스크립트
 * 실행: npx tsx src/sim.ts
 *
 * ── 모드 ──
 * 1) 랜덤 모드 (기본):  npx tsx src/sim.ts
 *    재현:              SIM_SEED=12345 npx tsx src/sim.ts
 *
 * 2) 커스텀 모드: 클래스 지정 (쉼표 구분, 3명+예비1 = 4명)
 *    PLAYER=WARRIOR,ARCHER,GUARDIAN,LANCER ENEMY=ASSASSIN,CONTROLLER,WARRIOR,ARCHER npx tsx src/sim.ts
 *    → 카드는 해당 클래스 풀에서 랜덤 추첨 (시드 기반)
 *    → 포지션은 클래스 선호도 자동 배정
 *
 * 3) 직접 지정 모드: 아래 MANUAL_TEAMS를 편집하고 실행
 *    → 클래스 + 액션 슬롯(기술)을 직접 지정
 *    → 사용 가능한 액션 목록은 ACTION_CATALOG에서 확인
 *    → npx tsx src/sim.ts
 */

import { generateCharacterDef, createUnit, resetUnitCounter } from './entities/UnitFactory';
import { createBattleState, stepBattle } from './core/BattleEngine';
import { CharacterClass, Team, Position, Target, Rarity, BuffType } from './types';
import { getAvailableClasses, CLASS_DEFINITIONS } from './data/ClassDefinitions';
import { UNIVERSAL_CARD_TEMPLATES } from './data/ActionPool';
import type {
  BattleState,
  BattleEvent,
  BattleUnit,
  ActionSlot,
  ActionCondition,
  ActionEffect,
  ActionTargetType,
} from './types';

// ══════════════════════════════════════════════════════
//  직접 지정 모드 — 여기를 편집하세요!
//  MANUAL_TEAMS를 null이 아닌 값으로 설정하면 활성화됩니다.
//  null로 두면 기존 랜덤/환경변수 모드로 동작합니다.
// ══════════════════════════════════════════════════════

/*
 * ┌─────────────────────────────────────────────────────┐
 * │              📋 사용 가능한 타겟 (Target)             │
 * ├─────────────────────────────────────────────────────┤
 * │ Target.SELF            - 자기 자신                   │
 * │ Target.ENEMY_FRONT     - 적 전열 (AGI 높은 적)       │
 * │ Target.ENEMY_BACK      - 적 후열 (AGI 높은 적)       │
 * │ Target.ENEMY_ANY       - 적 전체 (HP 낮은 적)        │
 * │ Target.ALLY_LOWEST_HP  - 아군 중 HP 가장 낮은 유닛   │
 * ├─────────────────────────────────────────────────────┤
 * │              📋 사용 가능한 조건 (Condition)          │
 * ├─────────────────────────────────────────────────────┤
 * │ { type: 'ALWAYS' }                  - 항상           │
 * │ { type: 'POSITION_FRONT' }          - 전열일 때      │
 * │ { type: 'POSITION_BACK' }           - 후열일 때      │
 * │ { type: 'HP_BELOW', value: 50 }     - HP 50% 이하   │
 * │ { type: 'HP_ABOVE', value: 50 }     - HP 50% 이상   │
 * │ { type: 'ENEMY_FRONT_EXISTS' }      - 적 전열 존재   │
 * │ { type: 'ENEMY_BACK_EXISTS' }       - 적 후열 존재   │
 * │ { type: 'ENEMY_HP_BELOW', value: 30 } - 적 HP 30%↓  │
 * │ { type: 'FIRST_ACTION_THIS_ROUND' } - 라운드 첫 행동 │
 * ├─────────────────────────────────────────────────────┤
 * │            📋 사용 가능한 효과 (Effect)               │
 * ├─────────────────────────────────────────────────────┤
 * │ { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT }         │
 * │ { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF }                │
 * │ { type: 'HEAL', value: 20, target: Target.SELF }                                │
 * │ { type: 'MOVE', target: Target.SELF, position: 'FRONT' }                        │
 * │ { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' }                  │
 * │ { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF } │
 * │ { type: 'DEBUFF', buffType: 'GUARD_DOWN', duration: 2, value: 2, target: ... }  │
 * │ { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY }                      │
 * │ { type: 'ADVANCE_TURN', value: 1, target: Target.SELF }                         │
 * │ { type: 'SWAP', target: Target.ENEMY_BACK, swapTarget: Target.ENEMY_FRONT }     │
 * └─────────────────────────────────────────────────────┘
 *
 * ── 액션 카드 카탈로그 (실행 시 콘솔에도 출력됩니다) ──
 * 아래 예시처럼 actionSlots에 3개 슬롯을 직접 지정하세요.
 * 각 슬롯은 { condition, action: { id, name, effects } } 형태입니다.
 */

interface ManualUnit {
  name: string;
  characterClass: string; // 'WARRIOR' | 'ARCHER' | 'GUARDIAN' | 'LANCER' | 'CONTROLLER' | 'ASSASSIN'
  position?: string; // 'FRONT' | 'BACK' (생략 시 클래스 선호 포지션)
  actionSlots: ActionSlot[]; // 3개 액션 슬롯 직접 지정
}

interface ManualTeams {
  player: ManualUnit[]; // 앞 3명 = 전투 참가, 4번째부터 = 예비
  enemy: ManualUnit[];
}

// ══════════════════════════════════════════════════════
//  🎮 시나리오 선택 — 이름만 바꿔서 실행!
//     '' (빈 문자열) = 랜덤/환경변수 모드
// ══════════════════════════════════════════════════════
const MANUAL_SCENARIO = 'FRONTLINE_STABILITY_TEST';

const MANUAL_SCENARIOS: Record<string, ManualTeams> = {
  // ─────────────────────────────────────────────────
  // 1) 아처 생존 검증 — FRONT 압박 시 탈출 카드가 의미 있는가?
  //    질문: Archer가 Lancer Push에 밀려 전열로 갔을 때 Evasive Shot/Snap Shot으로 살아남는가?
  //    Lancer Charge+Push가 후열 클래스 카운터로 작동하는가?
  // ─────────────────────────────────────────────────
  ARCHER_ESCAPE_VS_LANCER_PRESSURE: {
    player: [
      // Guardian — COVER로 Archer 보호 + 자기 실드
      {
        name: 'Bron',
        characterClass: 'GUARDIAN',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'guardian_shield_wall',
              name: 'Shield Wall',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'guardian_advance_guard',
              name: 'Advance Guard',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'guardian_heavy_shield',
              name: 'Heavy Shield',
              defensivePriority: true,
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer A — BACK 주력 + FRONT 탈출 + 고점 저격
      {
        name: 'Lyra',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ENEMY_BACK_EXISTS' },
            action: {
              id: 'archer_snipe',
              name: 'Snipe',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.6, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'RARE',
            },
          },
        ],
      },
      // Archer B — 제압형 + FRONT 대응(Snap Shot) + 범용 사격
      {
        name: 'Sera',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_suppressing_shot',
              name: 'Suppressing Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.7, stat: 'atk', target: Target.ENEMY_ANY },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_snap_shot',
              name: 'Snap Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_FRONT },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_volley',
              name: 'Volley',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
    enemy: [
      // Lancer — 진입 + 전열 압박 + PUSH
      {
        name: 'Kael',
        characterClass: 'LANCER',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'lancer_charge',
              name: 'Charge',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_piercing_thrust',
              name: 'Piercing Thrust',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_sweep',
              name: 'Sweep',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Warrior — 유지 + 공격 + 저체력 대응
      {
        name: 'Aldric',
        characterClass: 'WARRIOR',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_shield_bash',
              name: 'Shield Bash',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_heavy_slam',
              name: 'Heavy Slam',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'warrior_fortify',
              name: 'Fortify',
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'warrior_advance',
              name: 'Advance',
              description: '',
              effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Controller — 위치 조작 + 턴 지연 + fallback
      {
        name: 'Vex',
        characterClass: 'CONTROLLER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'ENEMY_FRONT_EXISTS' },
            action: {
              id: 'controller_banish',
              name: 'Banish',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ALWAYS' },
            action: {
              id: 'controller_mind_jolt',
              name: 'Mind Jolt',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.5, stat: 'atk', target: Target.ENEMY_ANY },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'controller_tactical_shot',
              name: 'Tactical Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 2) 암살 vs 커버 — Assassin 침투가 Guardian COVER에 얼마나 막히는가?
  //    질문: Dive/Shadow Strike로 후열 킬각을 만들 수 있는가?
  //    Guardian COVER가 암살 대응책으로 충분한가?
  // ─────────────────────────────────────────────────
  ASSASSIN_DIVE_VS_GUARDIAN_COVER: {
    player: [
      // Assassin A — 침투 + 전열 운영 + 킬 카드
      {
        name: 'Shade',
        characterClass: 'ASSASSIN',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'assassin_dive',
              name: 'Dive',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_BACK },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_gut_strike',
              name: 'Gut Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_shadow_strike',
              name: 'Shadow Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 2.0, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'EPIC',
            },
          },
        ],
      },
      // Assassin B — 침투(Shadowstep) + Swift Blade 연타 + 탈출
      {
        name: 'Nyx',
        characterClass: 'ASSASSIN',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'assassin_shadowstep',
              name: 'Shadowstep',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'ADVANCE_TURN', value: 1, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_swift_blade',
              name: 'Swift Blade',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'ADVANCE_TURN', value: 1, target: Target.SELF },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 40 },
            action: {
              id: 'assassin_withdraw',
              name: 'Withdraw',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer — 후열 지원 화력
      {
        name: 'Lyra',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ENEMY_HP_BELOW', value: 30 },
            action: {
              id: 'archer_focus_fire',
              name: 'Focus Fire',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.6, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'RARE',
            },
          },
        ],
      },
    ],
    enemy: [
      // Guardian — COVER + 자기 보호 + 아군 보호
      {
        name: 'Bron',
        characterClass: 'GUARDIAN',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'guardian_shield_wall',
              name: 'Shield Wall',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'guardian_advance_guard',
              name: 'Advance Guard',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'guardian_heavy_shield',
              name: 'Heavy Shield',
              defensivePriority: true,
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer — 후열 딜러 (보호 대상)
      {
        name: 'Mira',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_volley',
              name: 'Volley',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Controller — 위치 교란으로 Assassin 견제
      {
        name: 'Vex',
        characterClass: 'CONTROLLER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'ENEMY_FRONT_EXISTS' },
            action: {
              id: 'controller_banish',
              name: 'Banish',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ALWAYS' },
            action: {
              id: 'controller_mind_jolt',
              name: 'Mind Jolt',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.5, stat: 'atk', target: Target.ENEMY_ANY },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'controller_tactical_shot',
              name: 'Tactical Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 3) Controller+Archer 시너지 — Controller가 판을 깔아주면 Archer가 빛나는가?
  //    질문: Gravity Pull/Displace로 적을 끌어오면 Archer 고배율 카드와 맞물리는가?
  //    Controller가 "셋업 클래스"로 작동하는가?
  // ─────────────────────────────────────────────────
  CONTROLLER_ENABLES_ARCHER: {
    player: [
      // Controller — PULL + SWAP + 턴 지연
      {
        name: 'Vex',
        characterClass: 'CONTROLLER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'ENEMY_BACK_EXISTS' },
            action: {
              id: 'controller_gravity_pull',
              name: 'Gravity Pull',
              description: '',
              effects: [{ type: 'PUSH', target: Target.ENEMY_BACK, position: 'FRONT' }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'ENEMY_BACK_EXISTS' },
            action: {
              id: 'controller_displace',
              name: 'Displace',
              description: '',
              effects: [{ type: 'SWAP', target: Target.ENEMY_BACK, swapTarget: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ALWAYS' },
            action: {
              id: 'controller_mind_jolt',
              name: 'Mind Jolt',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.5, stat: 'atk', target: Target.ENEMY_ANY },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
              ],
              rarity: 'RARE',
            },
          },
        ],
      },
      // Archer — BACK 주력 + 저격 + FRONT 탈출
      {
        name: 'Lyra',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ENEMY_BACK_EXISTS' },
            action: {
              id: 'archer_snipe',
              name: 'Snipe',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.6, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Guardian — COVER + 아군 보호 + 자기 보호
      {
        name: 'Bron',
        characterClass: 'GUARDIAN',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'guardian_shield_wall',
              name: 'Shield Wall',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'guardian_advance_guard',
              name: 'Advance Guard',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'guardian_heavy_shield',
              name: 'Heavy Shield',
              defensivePriority: true,
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
    enemy: [
      // Warrior — 유지 + 공격 + 저체력 대응
      {
        name: 'Aldric',
        characterClass: 'WARRIOR',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_shield_bash',
              name: 'Shield Bash',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_heavy_slam',
              name: 'Heavy Slam',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'warrior_fortify',
              name: 'Fortify',
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'warrior_advance',
              name: 'Advance',
              description: '',
              effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer — 후열 딜러
      {
        name: 'Sera',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_suppressing_shot',
              name: 'Suppressing Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.7, stat: 'atk', target: Target.ENEMY_ANY },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Lancer — 진입 + 전열 압박 + 포지션 변화
      {
        name: 'Kael',
        characterClass: 'LANCER',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'lancer_charge',
              name: 'Charge',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_piercing_thrust',
              name: 'Piercing Thrust',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_sweep',
              name: 'Sweep',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 4) ADVANCE_TURN 경제 붕괴 테스트 — Shadowstep+Swift Blade 루프가 과한가?
  //    질문: Assassin이 턴 독점 캐릭터가 되는가?
  //    리스크 딜러 정체성이 유지되는가? Withdraw가 실제로 의미 있는 탈출기인가?
  // ─────────────────────────────────────────────────
  ASSASSIN_TEMPO_LOOP_TEST: {
    player: [
      // Assassin A — Shadowstep 진입 + Swift Blade 연타 + 탈출
      {
        name: 'Shade',
        characterClass: 'ASSASSIN',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'assassin_shadowstep',
              name: 'Shadowstep',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'ADVANCE_TURN', value: 1, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_swift_blade',
              name: 'Swift Blade',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'ADVANCE_TURN', value: 1, target: Target.SELF },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 40 },
            action: {
              id: 'assassin_withdraw',
              name: 'Withdraw',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Assassin B — Dive 직행 + Venomous Strike 디버프 + 킬 카드
      {
        name: 'Nyx',
        characterClass: 'ASSASSIN',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'assassin_dive',
              name: 'Dive',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_BACK },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_venomous_strike',
              name: 'Venomous Strike',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'DEBUFF', buffType: 'GUARD_DOWN', duration: 2, value: 2, target: Target.ENEMY_FRONT },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_shadow_strike',
              name: 'Shadow Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 2.0, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'EPIC',
            },
          },
        ],
      },
      // Guardian — 전열 유지하며 Assassin이 죽기 전 버텨주기
      {
        name: 'Bron',
        characterClass: 'GUARDIAN',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'guardian_shield_wall',
              name: 'Shield Wall',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'guardian_advance_guard',
              name: 'Advance Guard',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'guardian_heavy_shield',
              name: 'Heavy Shield',
              defensivePriority: true,
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
    enemy: [
      // Warrior — 전열 유지 탱커
      {
        name: 'Aldric',
        characterClass: 'WARRIOR',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_shield_bash',
              name: 'Shield Bash',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_strike',
              name: 'Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'warrior_fortify',
              name: 'Fortify',
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'warrior_advance',
              name: 'Advance',
              description: '',
              effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Lancer — 진입 + 전열 압박
      {
        name: 'Kael',
        characterClass: 'LANCER',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'lancer_charge',
              name: 'Charge',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_lance_strike',
              name: 'Lance Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_sweep',
              name: 'Sweep',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer — 후열 딜러
      {
        name: 'Sera',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_volley',
              name: 'Volley',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 5) 전열 클래스 삼각관계 — Warrior/Guardian/Lancer가 서로 다른 역할을 하는가?
  //    질문: Warrior는 sustain인가? Guardian은 탱킹 가치가 있는가?
  //    Lancer는 Warrior와 역할이 진짜 다른가?
  // ─────────────────────────────────────────────────
  FRONTLINE_STABILITY_TEST: {
    player: [
      // Warrior — 유지(Shield Bash) + 공격(Heavy Slam) + 저체력 대응(Fortify)
      {
        name: 'Aldric',
        characterClass: 'WARRIOR',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_shield_bash',
              name: 'Shield Bash',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_heavy_slam',
              name: 'Heavy Slam',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'warrior_fortify',
              name: 'Fortify',
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'warrior_advance',
              name: 'Advance',
              description: '',
              effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Guardian — COVER + 아군 보호 + 자기 보호
      {
        name: 'Bron',
        characterClass: 'GUARDIAN',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'guardian_shield_wall',
              name: 'Shield Wall',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'guardian_advance_guard',
              name: 'Advance Guard',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'guardian_heavy_shield',
              name: 'Heavy Shield',
              defensivePriority: true,
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer — 후열 화력
      {
        name: 'Lyra',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_suppressing_shot',
              name: 'Suppressing Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.7, stat: 'atk', target: Target.ENEMY_ANY },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
    enemy: [
      // Lancer — 진입 + 전열 압박 + PUSH
      {
        name: 'Kael',
        characterClass: 'LANCER',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'lancer_charge',
              name: 'Charge',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_piercing_thrust',
              name: 'Piercing Thrust',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_sweep',
              name: 'Sweep',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Warrior — 상대편 전열 대비
      {
        name: 'Theron',
        characterClass: 'WARRIOR',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_shield_bash',
              name: 'Shield Bash',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_driving_blow',
              name: 'Driving Blow',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.9, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'warrior_fortify',
              name: 'Fortify',
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'warrior_advance',
              name: 'Advance',
              description: '',
              effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Controller — 판 흔들기
      {
        name: 'Vex',
        characterClass: 'CONTROLLER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'ENEMY_FRONT_EXISTS' },
            action: {
              id: 'controller_banish',
              name: 'Banish',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'controller_disrupt',
              name: 'Disrupt',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_FRONT },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'controller_tactical_shot',
              name: 'Tactical Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 6) 클래스 정체성 스모크 테스트 — 각 클래스가 "자기답게" 움직이는가?
  //    질문: Warrior는 버티는가? Lancer는 미는가? Archer는 뒤에서 쏘는가?
  //    Controller는 판을 흔드는가? Assassin은 파고드는가?
  // ─────────────────────────────────────────────────
  CLASS_IDENTITY_SMOKE_TEST: {
    player: [
      // Warrior — 버티면서 치기
      {
        name: 'Aldric',
        characterClass: 'WARRIOR',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_shield_bash',
              name: 'Shield Bash',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'warrior_strike',
              name: 'Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'warrior_fortify',
              name: 'Fortify',
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'warrior_advance',
              name: 'Advance',
              description: '',
              effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer — 뒤에서 쏘기
      {
        name: 'Lyra',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ENEMY_BACK_EXISTS' },
            action: {
              id: 'archer_snipe',
              name: 'Snipe',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.6, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'RARE',
            },
          },
        ],
      },
      // Controller — 판 흔들기
      {
        name: 'Vex',
        characterClass: 'CONTROLLER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'ENEMY_FRONT_EXISTS' },
            action: {
              id: 'controller_banish',
              name: 'Banish',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ALWAYS' },
            action: {
              id: 'controller_mind_jolt',
              name: 'Mind Jolt',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.5, stat: 'atk', target: Target.ENEMY_ANY },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'controller_tactical_shot',
              name: 'Tactical Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.1, stat: 'atk', target: Target.ENEMY_ANY }],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
    enemy: [
      // Guardian — 탱킹
      {
        name: 'Bron',
        characterClass: 'GUARDIAN',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'guardian_shield_wall',
              name: 'Shield Wall',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'guardian_advance_guard',
              name: 'Advance Guard',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'guardian_heavy_shield',
              name: 'Heavy Shield',
              defensivePriority: true,
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Lancer — 밀기
      {
        name: 'Kael',
        characterClass: 'LANCER',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'lancer_charge',
              name: 'Charge',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_lance_strike',
              name: 'Lance Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_sweep',
              name: 'Sweep',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Assassin — 파고들기
      {
        name: 'Shade',
        characterClass: 'ASSASSIN',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'assassin_dive',
              name: 'Dive',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_BACK },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_gut_strike',
              name: 'Gut Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 40 },
            action: {
              id: 'assassin_withdraw',
              name: 'Withdraw',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────
  // 시나리오 7: ASSASSIN_BREAKS_BACKLINE
  //    질문: Assassin 압박이 Guardian+Archer 조합을 뚫을 수 있는가?
  //    체크: ① 첫 2턴 Archer 생존? ② Guardian 유지 턴수 ③ Assassin 타겟팅 ④ 후반 구조
  // ─────────────────────────────────────────────────
  ASSASSIN_BREAKS_BACKLINE: {
    player: [
      // Guardian — COVER로 Archer 2명 보호
      {
        name: 'Bron',
        characterClass: 'GUARDIAN',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'guardian_shield_wall',
              name: 'Shield Wall',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF },
                { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.ALLY_LOWEST_HP },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'guardian_advance_guard',
              name: 'Advance Guard',
              defensivePriority: true,
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'SHIELD', value: 1.2, stat: 'grd', target: Target.SELF },
                { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 50 },
            action: {
              id: 'guardian_heavy_shield',
              name: 'Heavy Shield',
              defensivePriority: true,
              description: '',
              effects: [{ type: 'SHIELD', value: 1.5, stat: 'grd', target: Target.SELF }],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Archer A — 후열 주력 딜러
      {
        name: 'Lyra',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ENEMY_BACK_EXISTS' },
            action: {
              id: 'archer_snipe',
              name: 'Snipe',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'RARE',
            },
          },
        ],
      },
      // Archer B — 후열 서브 딜러 + 견제
      {
        name: 'Sera',
        characterClass: 'ARCHER',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'archer_aimed_shot',
              name: 'Aimed Shot',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_BACK }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'archer_evasive_shot',
              name: 'Evasive Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'ENEMY_BACK_EXISTS' },
            action: {
              id: 'archer_suppressing_shot',
              name: 'Suppressing Shot',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.6, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_FRONT },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
    enemy: [
      // Assassin A — Dive 침투 + 후열 암살
      {
        name: 'Shade',
        characterClass: 'ASSASSIN',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'assassin_dive',
              name: 'Dive',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_BACK },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_gut_strike',
              name: 'Gut Strike',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.3, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 40 },
            action: {
              id: 'assassin_withdraw',
              name: 'Withdraw',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Assassin B — Shadowstep 침투 + 연타
      {
        name: 'Kain',
        characterClass: 'ASSASSIN',
        position: 'BACK',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'assassin_shadowstep',
              name: 'Shadowstep',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'ADVANCE_TURN', value: 1, target: Target.SELF },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'assassin_swift_blade',
              name: 'Swift Blade',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'ADVANCE_TURN', value: 1, target: Target.SELF },
              ],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'HP_BELOW', value: 40 },
            action: {
              id: 'assassin_withdraw',
              name: 'Withdraw',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 0.8, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'MOVE', target: Target.SELF, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
      // Lancer — 전열 압박 + PUSH로 Guardian 위치 붕괴
      {
        name: 'Kael',
        characterClass: 'LANCER',
        position: 'FRONT',
        actionSlots: [
          {
            condition: { type: 'POSITION_BACK' },
            action: {
              id: 'lancer_charge',
              name: 'Charge',
              description: '',
              effects: [
                { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
                { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_piercing_thrust',
              name: 'Piercing Thrust',
              description: '',
              effects: [{ type: 'DAMAGE', value: 1.5, stat: 'atk', target: Target.ENEMY_FRONT }],
              rarity: 'RARE',
            },
          },
          {
            condition: { type: 'POSITION_FRONT' },
            action: {
              id: 'lancer_sweep',
              name: 'Sweep',
              description: '',
              effects: [
                { type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT },
                { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
              ],
              rarity: 'COMMON',
            },
          },
        ],
      },
    ],
  },
};

const MANUAL_TEAMS = MANUAL_SCENARIO ? (MANUAL_SCENARIOS[MANUAL_SCENARIO] ?? null) : null;

// ── 액션 카탈로그 출력 함수 ──────────────────────────

function printActionCatalog(): void {
  console.log('═══════════════════════════════════════════');
  console.log('  📋 액션 카드 카탈로그 (참고용)');
  console.log('═══════════════════════════════════════════\n');

  const availableClasses = getAvailableClasses();
  for (const cls of availableClasses) {
    const template = CLASS_DEFINITIONS[cls];
    if (!template) continue;

    console.log(`── ${cls} ──────────────────`);

    // testActionSlots (기본 액션)
    console.log('  [기본 액션 (testActionSlots)]');
    for (const slot of template.testActionSlots) {
      const effects = slot.action.effects
        .map((e) => {
          let s = `${e.type}`;
          if (e.value) s += ` x${e.value}`;
          if (e.stat) s += `(${e.stat})`;
          if (e.position) s += `→${e.position}`;
          if (e.buffType) s += `[${e.buffType}]`;
          return s;
        })
        .join(' + ');
      console.log(
        `    ${slot.action.id}: ${slot.action.name} (${slot.condition.type}${slot.condition.value ? ':' + slot.condition.value : ''})`,
      );
      console.log(`      효과: ${effects}`);
    }

    // cardTemplates (카드 풀)
    console.log('  [카드 풀 (cardTemplates)]');
    for (const card of template.cardTemplates) {
      const effects = card.effectTemplates
        .map((e) => {
          let s = `${e.type}`;
          if (e.multiplierPool.length > 0 && e.multiplierPool[0] !== 0) {
            s += ` x${e.multiplierPool.join('/')}`;
          }
          if (e.stat) s += `(${e.stat})`;
          if (e.position) s += `→${e.position}`;
          if (e.buffType) s += `[${e.buffType}]`;
          return s;
        })
        .join(' + ');
      const restriction = card.classRestriction ? ` [${card.classRestriction} 전용]` : '';
      console.log(
        `    ${card.id}: ${card.name} [${card.rarity}]${restriction} (${card.condition.type}${card.condition.value ? ':' + card.condition.value : ''})`,
      );
      console.log(`      효과: ${effects}`);
    }
    console.log('');
  }

  // 범용 카드
  console.log('── UNIVERSAL (범용) ──────────────────');
  for (const card of UNIVERSAL_CARD_TEMPLATES) {
    const effects = card.effectTemplates
      .map((e) => {
        let s = `${e.type}`;
        if (e.multiplierPool.length > 0 && e.multiplierPool[0] !== 0) {
          s += ` x${e.multiplierPool.join('/')}`;
        }
        if (e.stat) s += `(${e.stat})`;
        if (e.position) s += `→${e.position}`;
        if (e.buffType) s += `[${e.buffType}]`;
        return s;
      })
      .join(' + ');
    console.log(`    ${card.id}: ${card.name} [${card.rarity}] (${card.condition.type})`);
    console.log(`      효과: ${effects}`);
  }
  console.log('\n');
}

// ── 직접 지정 팀 빌드 ──────────────────────────────

function buildManualTeam(manualUnits: ManualUnit[], team: Team, nameOffset: number, seedBase: number) {
  const units: BattleUnit[] = [];

  for (let i = 0; i < manualUnits.length; i++) {
    const mu = manualUnits[i];
    const cls = mu.characterClass;

    // generateCharacterDef로 스탯 생성 후 actionSlots만 오버라이드
    const def = generateCharacterDef(mu.name, cls, seedBase + i);
    def.baseActionSlots = mu.actionSlots.map((slot) => ({ ...slot }));

    const pos = (mu.position ?? preferredPosition(cls)) as any;
    units.push(createUnit(def, team, pos));
  }

  return { units };
}

// ── 시드 기반 난수 ─────────────────────────────────

// prettier-ignore
// @ts-ignore — Node.js 전용 스크립트
const masterSeed = typeof process !== 'undefined' && process.env?.SIM_SEED ? parseInt(process.env.SIM_SEED, 10) : Date.now();

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── 클래스별 선호 포지션 ──────────────────────────────

const FRONT_CLASSES: ReadonlySet<string> = new Set([
  CharacterClass.WARRIOR,
  CharacterClass.GUARDIAN,
  CharacterClass.LANCER,
]);

function preferredPosition(cls: string): string {
  return FRONT_CLASSES.has(cls) ? Position.FRONT : Position.BACK;
}

// ── 이름 풀 ─────────────────────────────────────────

const NAMES_POOL = [
  'Aldric',
  'Sylva',
  'Theron',
  'Kael',
  'Shade',
  'Vex',
  'Mira',
  'Bron',
  'Lyra',
  'Dusk',
  'Riven',
  'Nyx',
  'Orin',
  'Sera',
  'Thorn',
  'Zara',
];

// ── 랜덤 팀 생성 ──────────────────────────────────────

function buildRandomTeam(rand: () => number, team: Team, activeCount: number, nameOffset: number, seedBase: number) {
  const classes = getAvailableClasses();
  const units: BattleUnit[] = [];

  for (let i = 0; i < activeCount; i++) {
    const cls = classes[Math.floor(rand() * classes.length)];
    const name = NAMES_POOL[(nameOffset + i) % NAMES_POOL.length];
    const def = generateCharacterDef(name, cls, seedBase + i);
    const pos = preferredPosition(cls);
    units.push(createUnit(def, team, pos as any));
  }

  return { units };
}

// ── 커스텀 팀 생성 ─────────────────────────────────

// @ts-ignore — Node.js 전용
const envPlayer: string | undefined = typeof process !== 'undefined' ? process.env?.PLAYER : undefined;
// @ts-ignore
const envEnemy: string | undefined = typeof process !== 'undefined' ? process.env?.ENEMY : undefined;

function parseClassList(env: string): string[] {
  return env.split(',').map((s) => s.trim().toUpperCase());
}

function buildCustomTeam(classList: string[], team: Team, nameOffset: number, seedBase: number) {
  const available = getAvailableClasses();
  const units: BattleUnit[] = [];

  for (let i = 0; i < classList.length; i++) {
    const cls = classList[i];
    if (!available.includes(cls)) {
      console.error(`⚠ 알 수 없는 클래스: ${cls} (사용 가능: ${available.join(', ')})`);
      // @ts-ignore
      process.exit(1);
    }
    const name = NAMES_POOL[(nameOffset + i) % NAMES_POOL.length];
    const def = generateCharacterDef(name, cls, seedBase + i);
    const pos = preferredPosition(cls);
    units.push(createUnit(def, team, pos as any));
  }

  return { units };
}

// ── 팀 구성 ──────────────────────────────────────

resetUnitCounter();

const isManualMode = MANUAL_TEAMS !== null;
const isCustomMode = !isManualMode && !!(envPlayer || envEnemy);
const rand = seededRand(masterSeed);

// 시나리오 모드일 때 시나리오 이름 출력
if (MANUAL_SCENARIO) {
  console.log(`\n🎯 시나리오: ${MANUAL_SCENARIO}\n`);
}

const player = MANUAL_TEAMS
  ? buildManualTeam(MANUAL_TEAMS.player, Team.PLAYER, 0, masterSeed + 100)
  : envPlayer
    ? buildCustomTeam(parseClassList(envPlayer), Team.PLAYER, 0, masterSeed + 100)
    : buildRandomTeam(rand, Team.PLAYER, 4, 0, masterSeed + 100);

const enemy = MANUAL_TEAMS
  ? buildManualTeam(MANUAL_TEAMS.enemy, Team.ENEMY, 8, masterSeed + 200)
  : envEnemy
    ? buildCustomTeam(parseClassList(envEnemy), Team.ENEMY, 8, masterSeed + 200)
    : buildRandomTeam(rand, Team.ENEMY, 4, 8, masterSeed + 200);

// ── 전투 실행 ────────────────────────────────────

const initial = createBattleState(player.units, enemy.units, masterSeed);

// ── 유틸 함수 ──────────────────────────────────────

const allInitialUnits = [...initial.units];

function findUnitName(state: BattleState, id?: string): string {
  if (!id) return '???';
  const u = state.units.find((u) => u.id === id) ?? allInitialUnits.find((u) => u.id === id);
  return u ? `${u.name}(${u.team === Team.PLAYER ? 'P' : 'E'})` : id;
}

function findUnitObj(state: BattleState, id?: string): BattleUnit | undefined {
  if (!id) return undefined;
  return state.units.find((u) => u.id === id);
}

function posTag(pos: string): string {
  return pos === Position.FRONT ? '전열' : '후열';
}

function briefStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  const buffs = u.buffs.length > 0 ? ` [${u.buffs.map((b) => b.type).join(',')}]` : '';
  return `${alive}HP:${u.stats.hp}/${u.stats.maxHp}${shield} ${posTag(u.position)}${buffs}`;
}

function unitFinalStatus(u: BattleUnit): string {
  const alive = u.isAlive ? '⚔' : '💀';
  const shield = u.shield > 0 ? ` 🛡${u.shield}` : '';
  return `${alive} ${u.name} HP:${u.stats.hp}/${u.stats.maxHp}${shield} [${posTag(u.position)}]`;
}

function conditionStr(slot: ActionSlot): string {
  const c = slot.condition;
  if (c.type === 'ALWAYS') return '';
  if (c.value !== undefined) return ` (${c.type}:${c.value})`;
  return ` (${c.type})`;
}

function showActionSlots(slots: ActionSlot[]): string {
  return slots.map((s, i) => `${i + 1}. ${s.action.name}${conditionStr(s)}`).join('  |  ');
}

// ── 로그 출력: 초기 상태 ──────────────────────────

console.log('═══════════════════════════════════════════');
console.log('  TACTICAL AUTO-BATTLER  SIMULATION');
console.log(`  Seed: ${masterSeed}`);
console.log('═══════════════════════════════════════════\n');

console.log('── 초기 팀 구성 ──');
console.log('PLAYER:');
player.units.forEach((u) => {
  console.log(
    `  ${u.name} (${u.characterClass}) [${posTag(u.position)}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`,
  );
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});

console.log('ENEMY:');
enemy.units.forEach((u) => {
  console.log(
    `  ${u.name} (${u.characterClass}) [${posTag(u.position)}] HP:${u.stats.hp} ATK:${u.stats.atk} GRD:${u.stats.grd} AGI:${u.stats.agi}`,
  );
  console.log(`    행동: ${showActionSlots(u.actionSlots)}`);
});
console.log('');

// ── stepBattle 루프 + 이벤트 로그 ─────────────────

let current = initial;
let processedEvents = 0;
const maxSteps = 500;
let steps = 0;

while (!current.isFinished && steps < maxSteps) {
  const preStepUnits = current.units.map((u) => ({ ...u, stats: { ...u.stats } }));
  const result = stepBattle(current);
  current = result.state;
  steps++;

  const newEvents = current.events.slice(processedEvents);
  processedEvents = current.events.length;

  for (const ev of newEvents) {
    logEvent(ev, current, preStepUnits);
  }
}

function logEvent(ev: BattleEvent, state: BattleState, preStepUnits?: BattleUnit[]): void {
  const findPreUnit = (id?: string): BattleUnit | undefined => {
    if (!id || !preStepUnits) return findUnitObj(state, id);
    return preStepUnits.find((u) => u.id === id) ?? findUnitObj(state, id);
  };

  if (ev.type === 'ROUND_START') {
    console.log(`\n══ 라운드 ${ev.round} ══════════════════════════`);
    const order = (ev.data?.turnOrder as string[]) ?? [];
    console.log(`  턴 순서: ${order.map((id) => findUnitName(state, id)).join(' → ')}`);
    return;
  }

  if (ev.type === 'TURN_START') {
    const src = findPreUnit(ev.sourceId);
    const srcInfo = src ? ` ${briefStatus(src)}` : '';
    console.log(`\n  ── 턴 ${ev.turn}: ${findUnitName(state, ev.sourceId)}${srcInfo} ──`);
    return;
  }

  if (ev.type === 'ACTION_EXECUTED') {
    const action = ev.data?.actionName ?? ev.actionId ?? '?';
    const target = ev.targetId ? ` → ${findUnitName(state, ev.targetId)}` : '';
    console.log(`    ⚡ ${action}${target}`);
    return;
  }

  if (ev.type === 'ACTION_SKIPPED') {
    const reason = ev.data?.reason ?? 'unknown';
    console.log(`    ⏭ 행동 불가 (${reason})`);
    return;
  }

  if (ev.type === 'DAMAGE_DEALT') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    💥 ${findUnitName(state, ev.targetId)}에게 ${ev.value} 데미지${tgtInfo}`);
    return;
  }

  if (ev.type === 'HEAL_APPLIED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    💚 ${findUnitName(state, ev.targetId)} ${ev.value} 회복${tgtInfo}`);
    return;
  }

  if (ev.type === 'SHIELD_APPLIED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    🛡 ${findUnitName(state, ev.targetId)} 실드 +${ev.value}${tgtInfo}`);
    return;
  }

  if (ev.type === 'SHIELD_CLEARED') {
    const before = ev.data?.shieldBefore ?? '?';
    console.log(`    🛡❌ ${findUnitName(state, ev.targetId)} 실드 ${before} → 0`);
    return;
  }

  if (ev.type === 'UNIT_MOVED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    🔄 ${findUnitName(state, ev.targetId)} ${posTag(String(from))} → ${posTag(String(to))}${tgtInfo}`);
    return;
  }

  if (ev.type === 'UNIT_PUSHED') {
    const from = ev.data?.from ?? '?';
    const to = ev.data?.to ?? '?';
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(
      `    ↗ ${findUnitName(state, ev.targetId)} ${posTag(String(from))} → ${posTag(String(to))}로 밀림${tgtInfo}`,
    );
    return;
  }

  if (ev.type === 'UNIT_DIED') {
    console.log(`    💀 ${findUnitName(state, ev.targetId)} 사망!`);
    return;
  }

  if (ev.type === 'COVER_TRIGGERED') {
    const original = ev.data?.originalTargetId as string | undefined;
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` ${briefStatus(tgt)}` : '';
    console.log(
      `    🛡️ ${findUnitName(state, ev.targetId)}이(가) ${findUnitName(state, original)} 대신 피격!${tgtInfo}`,
    );
    return;
  }

  if (ev.type === 'HERO_INTERVENTION') {
    console.log(`    👑 히어로 개입! → ${findUnitName(state, ev.targetId)}`);
    return;
  }

  if (ev.type === 'BUFF_APPLIED' || ev.type === 'DEBUFF_APPLIED') {
    const buffType = ev.data?.buffType ?? '?';
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(
      `    ✨ ${findUnitName(state, ev.targetId)} ${buffType} ${ev.type === 'BUFF_APPLIED' ? '부여' : '디버프'}${tgtInfo}`,
    );
    return;
  }

  if (ev.type === 'BUFF_EXPIRED') {
    console.log(`    ⏰ ${findUnitName(state, ev.targetId)} 버프 만료`);
    return;
  }

  if (ev.type === 'DELAYED_EFFECT_APPLIED') {
    const effectType = ev.data?.effectType ?? '?';
    const delayRounds = ev.data?.delayRounds ?? '?';
    console.log(`    ⏳ ${findUnitName(state, ev.targetId)}에게 지연 효과 (${effectType}, ${delayRounds}라운드 후)`);
    return;
  }

  if (ev.type === 'DELAYED_EFFECT_RESOLVED') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    console.log(`    💫 지연 효과 발동! ${findUnitName(state, ev.targetId)}${tgtInfo}`);
    return;
  }

  if (ev.type === 'STATUS_EFFECT_TICK') {
    const tgt = findUnitObj(state, ev.targetId);
    const tgtInfo = tgt ? ` → ${briefStatus(tgt)}` : '';
    const effectType = ev.data?.effectType ?? '?';
    console.log(`    🔥 ${findUnitName(state, ev.targetId)} ${effectType} ${ev.value}${tgtInfo}`);
    return;
  }

  if (ev.type === 'ROUND_END') {
    console.log(`\n  ── 라운드 ${ev.round} 종료 ──`);
    const alive = state.units.filter((u) => u.isAlive);
    const players = alive.filter((u) => u.team === Team.PLAYER);
    const enemies = alive.filter((u) => u.team === Team.ENEMY);
    console.log(`  생존: P[${players.map((u) => `${u.name} ${briefStatus(u)}`).join(', ')}]`);
    console.log(`        E[${enemies.map((u) => `${u.name} ${briefStatus(u)}`).join(', ')}]`);
    return;
  }

  if (ev.type === 'OVERSEER_WRATH_WARNING') {
    console.log(`  ⚡ 관리자의 진노! ${ev.data?.message ?? ''} (카운트다운: ${ev.data?.countdown})`);
    return;
  }

  if (ev.type === 'OVERSEER_WRATH_LIFTED') {
    console.log(`  ✦ 관리자의 진노 해소 — ${ev.data?.message ?? ''}`);
    return;
  }

  if (ev.type === 'BATTLE_END') {
    const winner = ev.data?.winner;
    const reason = ev.data?.reason ? ` [${ev.data.reason}]` : '';
    console.log(`\n══════════════════════════════════════════`);
    console.log(`  전투 종료! 승자: ${winner === Team.PLAYER ? 'PLAYER 🎉' : 'ENEMY 😈'}${reason}`);
    console.log(`  총 라운드: ${ev.round}, 총 이벤트: ${current.events.length}`);
    return;
  }
}

// 최종 유닛 상태
console.log('\n── 최종 유닛 상태 ──');
current.units.forEach((u) => console.log(`  ${unitFinalStatus(u)}`));

console.log('═══════════════════════════════════════════\n');
