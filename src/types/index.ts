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
export type CharacterClass = (typeof CharacterClass)[keyof typeof CharacterClass];

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

// === Condition Types ===

export type ConditionType =
  | 'ALWAYS'
  | 'POSITION_FRONT'
  | 'POSITION_BACK'
  | 'HP_BELOW'
  | 'HP_ABOVE'
  | 'ENEMY_FRONT_EXISTS'
  | 'ENEMY_BACK_EXISTS'
  | 'ALLY_HP_BELOW';

export interface ActionCondition {
  type: ConditionType;
  value?: number; // e.g., HP threshold percentage
}

// === Action Types ===

export type ActionTargetType = 'SELF' | 'ENEMY_FRONT' | 'ENEMY_BACK' | 'ENEMY_ANY' | 'ALLY_LOWEST_HP' | 'ALLY_ANY';

export interface ActionEffect {
  type: 'DAMAGE' | 'HEAL' | 'SHIELD' | 'MOVE' | 'PUSH' | 'BUFF' | 'DEBUFF';
  value?: number;      // multiplier or flat value
  stat?: keyof Stats;  // which stat to reference
  target?: ActionTargetType;
  position?: Position; // for MOVE/PUSH effects
}

export interface Action {
  id: string;
  name: string;
  description: string;
  effects: ActionEffect[];
  isBasic?: boolean; // true for character's unique basic action
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
  def: number;
  agi: number;
}

// === Character Definition (data) ===

export interface CharacterDefinition {
  id: string;
  name: string;
  characterClass: CharacterClass;
  baseStats: Omit<Stats, 'maxHp'>;
  basicAction: Action;
  trainingLevel: number;
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
  actionSlots: ActionSlot[];
  isAlive: boolean;
  hasActedThisRound: boolean;
}

// === Hero ===

export interface HeroAbility {
  id: string;
  name: string;
  description: string;
  effects: ActionEffect[];
}

export interface HeroState {
  interventionsRemaining: number;
  maxInterventionsPerRound: number;
  abilities: HeroAbility[];
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
  | 'ROUND_END'
  | 'BATTLE_END';

export interface BattleEvent {
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
