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
  value: number; // 스탯 수정량 또는 틱 데미지/힐량
  duration: number; // 남은 라운드 수 (라운드 종료 시 감소)
  sourceId: string; // 버프를 부여한 유닛 ID
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
  | 'HAS_HERO_BUFF'
  | 'ENEMY_HP_BELOW';

export interface ActionCondition {
  type: ConditionType;
  value?: number; // e.g., HP threshold percentage
}

// === Target Types (복합 객체: side × position × select) ===

export const TargetSide = {
  SELF: 'SELF',
  ENEMY: 'ENEMY',
  ALLY: 'ALLY',
} as const;
export type TargetSide = (typeof TargetSide)[keyof typeof TargetSide];

export const TargetPosition = {
  FRONT: 'FRONT',
  BACK: 'BACK',
  ANY: 'ANY',
} as const;
export type TargetPosition = (typeof TargetPosition)[keyof typeof TargetPosition];

export const TargetSelect = {
  HIGHEST_AGI: 'HIGHEST_AGI',
  LOWEST_HP: 'LOWEST_HP',
  HIGHEST_ATK: 'HIGHEST_ATK',
  RANDOM: 'RANDOM',
  FASTEST_TURN: 'FASTEST_TURN',
  FIRST: 'FIRST',
} as const;
export type TargetSelect = (typeof TargetSelect)[keyof typeof TargetSelect];

export type ActionTargetType =
  | { readonly side: 'SELF' }
  | { readonly side: 'ENEMY' | 'ALLY'; readonly position: TargetPosition; readonly select: TargetSelect };

/** 편의 상수 — 기존 문자열 타겟과 1:1 대응 */
export const Target = {
  SELF: { side: 'SELF' } as const,
  ENEMY_FRONT: { side: 'ENEMY', position: 'FRONT', select: 'HIGHEST_AGI' } as const,
  ENEMY_BACK: { side: 'ENEMY', position: 'BACK', select: 'HIGHEST_AGI' } as const,
  ENEMY_ANY: { side: 'ENEMY', position: 'ANY', select: 'LOWEST_HP' } as const,
  ALLY_LOWEST_HP: { side: 'ALLY', position: 'ANY', select: 'LOWEST_HP' } as const,
  ALLY_ANY: { side: 'ALLY', position: 'ANY', select: 'FIRST' } as const,
  ENEMY_BACK_LOWEST_HP: { side: 'ENEMY', position: 'BACK', select: 'LOWEST_HP' } as const,
  ENEMY_BACK_HIGHEST_ATK: { side: 'ENEMY', position: 'BACK', select: 'HIGHEST_ATK' } as const,
} as const;

// === Action Types ===

export interface ActionEffect {
  type:
    | 'DAMAGE'
    | 'HEAL'
    | 'SHIELD'
    | 'MOVE'
    | 'PUSH'
    | 'BUFF'
    | 'DEBUFF'
    | 'DELAY_TURN'
    | 'ADVANCE_TURN'
    | 'REPOSITION'
    | 'DELAYED'
    | 'SWAP';
  value?: number; // multiplier or flat value
  stat?: keyof Stats; // which stat to reference
  target?: ActionTargetType;
  position?: Position; // for MOVE/PUSH/REPOSITION effects
  buffType?: BuffType; // for BUFF/DEBUFF effects
  duration?: number; // buff 지속 라운드 수
  delayedType?: 'DAMAGE' | 'HEAL' | 'BUFF'; // DELAYED 효과 시 발동할 효과 종류
  delayRounds?: number; // DELAYED 효과 시 몇 라운드 후 발동
  swapTarget?: ActionTargetType; // SWAP 효과 시 교환 상대 타겟
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
  isBasic?: boolean; // true for character's unique basic action
  rarity?: Rarity; // 액션 카드 희귀도
  classRestriction?: CharacterClass; // 특정 클래스 전용 (없으면 범용)
  defensivePriority?: boolean; // true면 턴 순서에서 공격 행동보다 먼저 실행
}

export interface ActionSlot {
  condition: ActionCondition;
  action: Action;
}

// === Card Template (카드 변형 생성용) ===

/** 효과 하나의 변형 축 정의 */
export interface EffectTemplate {
  type: ActionEffect['type'];
  stat?: keyof Stats;
  multiplierPool: number[]; // 이 중 하나 랜덤 선택
  targetPool: ActionTargetType[]; // 이 중 하나 랜덤 선택
  position?: Position; // MOVE/PUSH용 고정값
  buffType?: BuffType; // BUFF/DEBUFF용 고정값
  duration?: number; // 버프 지속 라운드
  swapTarget?: ActionTargetType; // SWAP 효과 시 교환 상대 타겟
}

/** 카드 템플릿 — 획득 시 변형 생성의 원본 */
export interface CardTemplate {
  id: string;
  name: string;
  rarity: Rarity;
  classRestriction?: CharacterClass;
  condition: ActionCondition;
  effectTemplates: EffectTemplate[];
  defensivePriority?: boolean; // 생성된 Action에 전달
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
  trainingsUsed: number; // 사용한 훈련 횟수
  trainingPotential: number; // 최대 훈련 횟수 (2~5)
}

// === Delayed Effect ===

export interface DelayedEffect {
  id: string; // 고유 식별자
  sourceId: string; // 효과를 생성한 유닛 ID
  targetId: string; // 효과 대상 유닛 ID
  effectType: 'DAMAGE' | 'HEAL' | 'BUFF'; // 발동 시 적용할 효과
  value: number; // 데미지량 / 힐량 / 버프 수치
  remainingRounds: number; // 남은 라운드 수 (0이 되면 발동)
  buffType?: BuffType; // effectType이 BUFF일 때 버프 종류
  buffDuration?: number; // effectType이 BUFF일 때 버프 지속시간
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
  trainingsUsed: number; // 사용한 훈련 횟수 (§24)
  trainingPotential: number; // 최대 훈련 횟수 (§23.5)
}

// === Battle State (전체 전투 상태를 하나의 객체로 관리) ===

export interface BattleState {
  units: BattleUnit[];
  reserve: BattleUnit[]; // 대기 유닛
  hero: HeroState;
  round: number;
  turn: number;
  turnOrder: string[]; // unit id 순서
  phase: BattlePhase;
  events: BattleEvent[]; // 리플레이용 전체 로그
  delayedEffects: DelayedEffect[]; // §7.2 지연 효과
  isFinished: boolean;
  winner: Team | null;
  seed: number; // 결정론적 재현을 위한 랜덤 시드
  stalemateCountdown?: number; // §22.1 교착 카운트다운 (없으면 교착 아님)
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
  COMMANDER: 'COMMANDER', // 지휘(버프) 위주
  MAGE: 'MAGE', // 직접 타격(마법)
  SUPPORT: 'SUPPORT', // 회복/지원
} as const;
export type HeroType = (typeof HeroType)[keyof typeof HeroType];

export const AbilityCategory = {
  COMMON: 'COMMON',
  UNIQUE: 'UNIQUE',
} as const;
export type AbilityCategory = (typeof AbilityCategory)[keyof typeof AbilityCategory];

export const AbilityType = {
  EFFECT: 'EFFECT',
  EDIT_ACTION: 'EDIT_ACTION',
} as const;
export type AbilityType = (typeof AbilityType)[keyof typeof AbilityType];

export interface HeroAbility {
  id: string;
  name: string;
  description: string;
  effects: ActionEffect[];
  category: AbilityCategory;
  abilityType: AbilityType;
}

/** EDIT_ACTION 큐잉 시 필요한 추가 데이터 */
export interface QueuedEditData {
  targetUnitId: string;
  slotIndex: number;
  newAction: Action;
  newCondition: ActionCondition;
}

export interface HeroState {
  heroType: HeroType;
  interventionsRemaining: number;
  maxInterventionsPerRound: number;
  abilities: HeroAbility[];
  // 개입 큐잉: 유닛 행동 사이에 끼워 넣기 위한 대기열
  queuedAbility?: HeroAbility;
  queuedTargetId?: string;
  queuedEditData?: QueuedEditData;
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
  | 'UNIT_SWAPPED'
  | 'COVER_TRIGGERED'
  | 'ACTION_EDITED'
  | 'OVERSEER_WRATH_WARNING'
  | 'OVERSEER_WRATH_LIFTED'
  | 'ROUND_END'
  | 'BATTLE_END';

export interface BattleEvent {
  id: string; // 고유 ID (리플레이 탐색용)
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

// === Card Instance (런 중 인벤토리 카드) ===

export interface CardInstance {
  instanceId: string; // 고유 ID
  templateId: string; // 원본 CardTemplate 참조
  action: Action; // 확정된 액션 (multiplier, target 등 롤링 완료)
  classRestriction?: CharacterClass; // 클래스 제한 (없으면 공용)
  rarity: Rarity;
}

// === Enemy Archetype (적 아키타입) ===

export const EnemyArchetype = {
  BRUTE: 'BRUTE',
  GUARD: 'GUARD',
  RANGER: 'RANGER',
  DISRUPTOR: 'DISRUPTOR',
} as const;
export type EnemyArchetype = (typeof EnemyArchetype)[keyof typeof EnemyArchetype];

/** 아키타입 → 기반 아군 클래스 매핑 (스탯 참조용) */
export const ARCHETYPE_CLASS_MAP: Record<EnemyArchetype, string> = {
  [EnemyArchetype.BRUTE]: CharacterClass.WARRIOR,
  [EnemyArchetype.GUARD]: CharacterClass.GUARDIAN,
  [EnemyArchetype.RANGER]: CharacterClass.ARCHER,
  [EnemyArchetype.DISRUPTOR]: CharacterClass.CONTROLLER,
};

/** 적 아키타입 정의 (행동셋 포함) */
export interface EnemyArchetypeDefinition {
  archetype: EnemyArchetype;
  name: string;
  baseClass: string; // 스탯 범위 참조할 아군 클래스
  defaultPosition: Position;
  actionSlots: ActionSlot[]; // 고정 행동 3슬롯
}

/** 스테이지 인카운터: 어떤 아키타입이 몇 명 등장하는지 */
export interface EncounterSlot {
  archetype: EnemyArchetype;
  count: number;
}

export interface StageEncounter {
  stage: number;
  slots: EncounterSlot[];
  /** 스테이지 내 변형 (Stage 4 등), seed로 선택 */
  variants?: EncounterSlot[][];
}

// === Run State ===

export const RunStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  VICTORY: 'VICTORY',
  DEFEAT: 'DEFEAT',
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

export interface RunState {
  currentStage: number;
  maxStages: number; // 5 (4 normal + 1 boss)
  seed: number;

  /** 출전 멤버 정의 (3 combat + 1 reserve) */
  party: CharacterDefinition[];
  /** 벤치 (객원 등, 출전하지 않는 캐릭터) */
  bench: CharacterDefinition[];
  /** 런 중 획득한 카드 인벤토리 */
  cardInventory: CardInstance[];
  /** 카드 장착 매핑: characterDefId → slotIndex → CardInstance.instanceId */
  equippedCards: Record<string, Record<number, string>>;

  gold: number;
  retryAvailable: boolean; // 현재 스테이지 재도전 가능 여부

  status: RunStatus;

  /** 런 시작 시 스냅샷 — 런 종료 시 복원용 */
  preRunPartySnapshot: CharacterDefinition[];
}

// === Battle Reward ===

export interface BattleReward {
  gold: number;
  cardOptions: CardInstance[]; // 선택 가능한 카드 인스턴스 목록
}

// === Character Reward (객원 멤버) ===

export interface CharacterReward {
  character: CharacterDefinition;
  isGuest: true; // 런 종료 시 퇴장
  probability: number; // 이 보상이 생성된 확률 (디버그/UI용)
}

// === Game Config ===

export interface GameConfig {
  initialRosterSlots: number; // 초기 로스터 슬롯 수
  maxRosterSize: number;
  teamSize: number;
  reserveSize: number;
  actionSlotsPerCharacter: number;
  heroInterventionsPerRound: number;
  maxRoundsPerBattle: number;
  runStages: number; // 런 스테이지 수
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  initialRosterSlots: 6,
  maxRosterSize: 10,
  teamSize: 3,
  reserveSize: 1,
  actionSlotsPerCharacter: 3,
  heroInterventionsPerRound: 1,
  maxRoundsPerBattle: 20,
  runStages: 5,
};
