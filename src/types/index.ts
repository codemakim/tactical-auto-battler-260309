// === Constants (as const objects instead of enums for erasableSyntaxOnly) ===

export const Position = {
  FRONT: 'FRONT',
  BACK: 'BACK',
} as const;
export type Position = (typeof Position)[keyof typeof Position];

export const Team = {
  PLAYER: 'PLAYER',
  ENEMY: 'ENEMY',
} as const;
export type Team = (typeof Team)[keyof typeof Team];

export const CharacterClass = {
  WARRIOR: 'WARRIOR',
  LANCER: 'LANCER',
  ARCHER: 'ARCHER',
  GUARDIAN: 'GUARDIAN',
  CONTROLLER: 'CONTROLLER',
  ASSASSIN: 'ASSASSIN',
} as const;
// string으로 개방 — 새 클래스 추가 시 이 파일 수정 불필요
export type CharacterClass = string;

export const BattlePhase = {
  ROUND_START: 'ROUND_START',
  TURN_START: 'TURN_START',
  ACTION_RESOLVE: 'ACTION_RESOLVE',
  TURN_END: 'TURN_END',
  ROUND_END: 'ROUND_END',
  BATTLE_END: 'BATTLE_END',
} as const;
export type BattlePhase = (typeof BattlePhase)[keyof typeof BattlePhase];

export const Difficulty = {
  EASY: 'EASY',
  STANDARD: 'STANDARD',
  HARD: 'HARD',
  NIGHTMARE: 'NIGHTMARE',
} as const;
export type Difficulty = (typeof Difficulty)[keyof typeof Difficulty];

// === Buff Types ===

export const BuffType = {
  ATK_UP: 'ATK_UP',
  ATK_DOWN: 'ATK_DOWN',
  GUARD_UP: 'GUARD_UP',
  GUARD_DOWN: 'GUARD_DOWN',
  AGI_UP: 'AGI_UP',
  AGI_DOWN: 'AGI_DOWN',
  POISON: 'POISON',
  REGEN: 'REGEN',
  STUN: 'STUN',
  COVER: 'COVER',
} as const;
export type BuffType = (typeof BuffType)[keyof typeof BuffType];

export interface Buff {
  id: string;
  type: BuffType;
  value: number;       // 스탯 수정량 또는 틱 데미지/힐량
  duration: number;    // 남은 라운드 수 (라운드 종료 시 감소)
  sourceId: string;    // 버프를 부여한 유닛 ID
}

// === Condition Types ===

export type ConditionType =
  | 'ALWAYS'
  | 'POSITION_FRONT'
  | 'POSITION_BACK'
  | 'HP_BELOW'
  | 'HP_ABOVE'
  | 'ENEMY_FRONT_EXISTS'
  | 'ENEMY_BACK_EXISTS'
  | 'ALLY_HP_BELOW'
  | 'LOWEST_HP_ENEMY'
  | 'FIRST_ACTION_THIS_ROUND'
  | 'HAS_HERO_BUFF';

export interface ActionCondition {
  type: ConditionType;
  value?: number; // e.g., HP threshold percentage
}

// === Action Types ===

export type ActionTargetType = 'SELF' | 'ENEMY_FRONT' | 'ENEMY_BACK' | 'ENEMY_ANY' | 'ALLY_LOWEST_HP' | 'ALLY_ANY';

export interface ActionEffect {
  type: 'DAMAGE' | 'HEAL' | 'SHIELD' | 'MOVE' | 'PUSH' | 'BUFF' | 'DEBUFF' | 'DELAY_TURN' | 'ADVANCE_TURN' | 'REPOSITION' | 'DELAYED';
  value?: number;      // multiplier or flat value
  stat?: keyof Stats;  // which stat to reference
  target?: ActionTargetType;
  position?: Position; // for MOVE/PUSH/REPOSITION effects
  buffType?: BuffType; // for BUFF/DEBUFF effects
  duration?: number;   // buff 지속 라운드 수
  delayedType?: 'DAMAGE' | 'HEAL' | 'BUFF';  // DELAYED 효과 시 발동할 효과 종류
  delayRounds?: number;   // DELAYED 효과 시 몇 라운드 후 발동
}

export const Rarity = {
  COMMON: 'COMMON',
  RARE: 'RARE',
  EPIC: 'EPIC',
  LEGENDARY: 'LEGENDARY',
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];

export interface Action {
  id: string;
  name: string;
  description: string;
  effects: ActionEffect[];
  isBasic?: boolean;                 // true for character's unique basic action
  rarity?: Rarity;                   // 액션 카드 희귀도
  classRestriction?: CharacterClass; // 특정 클래스 전용 (없으면 범용)
}

export interface ActionSlot {
  condition: ActionCondition;
  action: Action;
}

// === Character Stats ===

export interface Stats {
  hp: number;
  maxHp: number;
  atk: number;
  grd: number;
  agi: number;
}

// === Stat Range (캐릭터 생성 시 랜덤 범위) ===

export interface StatRange {
  hp: [number, number];
  atk: [number, number];
  grd: [number, number];
  agi: [number, number];
}

// === Training Stat (훈련 시 선택 가능한 스탯) ===

export type TrainableStat = 'hp' | 'atk' | 'grd' | 'agi';

// === Character Definition (data) ===

export interface CharacterDefinition {
  id: string;
  name: string;
  characterClass: CharacterClass;
  baseStats: Omit<Stats, 'maxHp'>;
  /** 클래스의 기본 3개 액션 슬롯. 런 리셋 시 이 슬롯으로 복원된다. */
  baseActionSlots: ActionSlot[];
  trainingsUsed: number;       // 사용한 훈련 횟수
  trainingPotential: number;   // 최대 훈련 횟수 (2~5)
}

// === Delayed Effect ===

export interface DelayedEffect {
  id: string;              // 고유 식별자
  sourceId: string;        // 효과를 생성한 유닛 ID
  targetId: string;        // 효과 대상 유닛 ID
  effectType: 'DAMAGE' | 'HEAL' | 'BUFF';  // 발동 시 적용할 효과
  value: number;           // 데미지량 / 힐량 / 버프 수치
  remainingRounds: number; // 남은 라운드 수 (0이 되면 발동)
  buffType?: BuffType;     // effectType이 BUFF일 때 버프 종류
  buffDuration?: number;   // effectType이 BUFF일 때 버프 지속시간
}

// === Battle Unit (runtime) ===

export interface BattleUnit {
  id: string;
  definitionId: string;
  name: string;
  characterClass: CharacterClass;
  team: Team;
  position: Position;
  stats: Stats;
  shield: number;
  buffs: Buff[];
  /** 현재 액션 슬롯 (런 중 교체 가능) */
  actionSlots: ActionSlot[];
  /** 런 시작 시의 기본 3개 슬롯 — 런 리셋 시 이 슬롯으로 복원된다 */
  baseActionSlots: ActionSlot[];
  /** 전투 시작 시 스냅샷 — 전투 종료 후 이 슬롯으로 복원 */
  preBattleActionSlots?: ActionSlot[];
  isAlive: boolean;
  hasActedThisRound: boolean;
  trainingsUsed: number;       // 사용한 훈련 횟수 (§24)
  trainingPotential: number;   // 최대 훈련 횟수 (§23.5)
}

// === Battle State (전체 전투 상태를 하나의 객체로 관리) ===

export interface BattleState {
  units: BattleUnit[];
  reserve: BattleUnit[];   // 대기 유닛
  hero: HeroState;
  round: number;
  turn: number;
  turnOrder: string[];     // unit id 순서
  phase: BattlePhase;
  events: BattleEvent[];   // 리플레이용 전체 로그
  delayedEffects: DelayedEffect[];  // §7.2 지연 효과
  isFinished: boolean;
  winner: Team | null;
  seed: number;            // 결정론적 재현을 위한 랜덤 시드
}

// === Battle Result (전투 종료 후 출력) ===

export interface BattleResult {
  winner: Team;
  rounds: number;
  totalEvents: number;
  replayData: BattleEvent[];
  survivingUnits: BattleUnit[];
}

// === Hero ===

export const HeroType = {
  COMMANDER: 'COMMANDER',  // 지휘(버프) 위주
  MAGE: 'MAGE',            // 직접 타격(마법)
  SUPPORT: 'SUPPORT',      // 회복/지원
} as const;
export type HeroType = (typeof HeroType)[keyof typeof HeroType];

export interface HeroAbility {
  id: string;
  name: string;
  description: string;
  effects: ActionEffect[];
}

export interface HeroState {
  heroType: HeroType;
  interventionsRemaining: number;
  maxInterventionsPerRound: number;
  abilities: HeroAbility[];
  // 개입 큐잉: 유닛 행동 사이에 끼워 넣기 위한 대기열
  queuedAbility?: HeroAbility;
  queuedTargetId?: string;
}

// === Battle Log (for replay) ===

export type BattleEventType =
  | 'ROUND_START'
  | 'TURN_START'
  | 'ACTION_EXECUTED'
  | 'ACTION_SKIPPED'
  | 'DAMAGE_DEALT'
  | 'HEAL_APPLIED'
  | 'SHIELD_APPLIED'
  | 'UNIT_MOVED'
  | 'UNIT_PUSHED'
  | 'UNIT_DIED'
  | 'RESERVE_ENTERED'
  | 'HERO_INTERVENTION'
  | 'BUFF_APPLIED'
  | 'DEBUFF_APPLIED'
  | 'SHIELD_CLEARED'
  | 'BUFF_EXPIRED'
  | 'STATUS_EFFECT_TICK'
  | 'DELAYED_EFFECT_APPLIED'
  | 'DELAYED_EFFECT_RESOLVED'
  | 'COVER_TRIGGERED'
  | 'ACTION_EDITED'
  | 'ROUND_END'
  | 'BATTLE_END';

export interface BattleEvent {
  id: string;           // 고유 ID (리플레이 탐색용)
  type: BattleEventType;
  round: number;
  turn: number;
  timestamp: number;
  sourceId?: string;
  targetId?: string;
  actionId?: string;
  value?: number;
  data?: Record<string, unknown>;
}

// === Run State ===

export interface RunState {
  currentStage: number;
  difficulty: Difficulty;
  gold: number;
  temporaryActions: Action[];
}

// === Battle Reward ===

export interface BattleReward {
  gold: number;
  actionOptions: Action[];
}

// === Character Reward ===

export interface CharacterReward {
  characterClass: CharacterClass;
  trainingPotential: number;  // 랜덤 생성된 잠재력 (2~5)
  probability: number;        // 이 보상이 생성된 확률 (0~1, 디버그/UI용)
}

// === Game Config ===

export interface GameConfig {
  maxRosterSize: number;
  teamSize: number;
  reserveSize: number;
  actionSlotsPerCharacter: number;
  heroInterventionsPerRound: number;
  maxRoundsPerBattle: number;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxRosterSize: 5,
  teamSize: 3,
  reserveSize: 1,
  actionSlotsPerCharacter: 3,
  heroInterventionsPerRound: 1,
  maxRoundsPerBattle: 20,
};
