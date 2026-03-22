import type { BattleState, RunState, BattleReward, CardInstance, CharacterReward, CharacterDefinition } from '../types';
import { Difficulty, Rarity, Team } from '../types';
import { generateRewardFromTemplates } from './ActionCardSystem';
import { getAvailableClasses } from '../data/ClassDefinitions';
import { getAllTemplatesForClass } from '../data/ActionPool';
import { generateCharacterDef } from '../entities/UnitFactory';

// 난이도별 골드 배율
const DIFFICULTY_GOLD_MULTIPLIER: Record<string, number> = {
  [Difficulty.EASY]: 0.8,
  [Difficulty.STANDARD]: 1.0,
  [Difficulty.HARD]: 1.3,
  [Difficulty.NIGHTMARE]: 1.6,
};

// 기본 골드 보상
const BASE_GOLD = 50;
// 라운드 보너스: 빠를수록 더 많이 (기준 라운드에서 초과 라운드당 감소)
const FAST_CLEAR_BONUS_BASE = 30;
const FAST_CLEAR_THRESHOLD = 5; // 이 라운드 이하면 최대 보너스
const ROUND_PENALTY = 5; // 기준 초과 라운드당 감소량
// 패배 시 골드 지급 비율
const DEFEAT_GOLD_RATIO = 0.3;

/**
 * 골드 보상 계산
 * 기본 골드 + 라운드 보너스 + 난이도 배율 적용
 * 패배 시 기본 보상의 일부만 지급
 */
export function calculateGoldReward(state: BattleState, difficulty: Difficulty): number {
  const multiplier = DIFFICULTY_GOLD_MULTIPLIER[difficulty] ?? 1.0;
  const roundBonus = Math.max(
    0,
    FAST_CLEAR_BONUS_BASE - Math.max(0, state.round - FAST_CLEAR_THRESHOLD) * ROUND_PENALTY,
  );
  const baseReward = Math.round((BASE_GOLD + roundBonus) * multiplier);

  // 패배 시 일부만 지급
  if (state.winner === Team.ENEMY || (state.isFinished && state.winner !== Team.PLAYER)) {
    return Math.round(baseReward * DEFEAT_GOLD_RATIO);
  }

  return baseReward;
}

/**
 * 시드 기반 간단한 난수 (mulberry32)
 */
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

let cardInstanceCounter = 0;

/** 카드 인스턴스 ID 카운터 리셋 (테스트용) */
export function resetCardInstanceCounter(): void {
  cardInstanceCounter = 0;
}

/**
 * 전투 보상 생성
 * 골드 계산 + 파티 전체 클래스 풀 기반 카드 5개 옵션 생성
 * 결정론적: seed 기반
 */
export function generateBattleRewards(
  state: BattleState,
  partyClasses: string[],
  seed: number,
  difficulty: Difficulty = Difficulty.STANDARD,
): BattleReward {
  const gold = calculateGoldReward(state, difficulty);

  // 파티 전체 클래스의 템플릿을 합쳐서 풀 구성
  const allTemplates = partyClasses.flatMap((cls) => getAllTemplatesForClass(cls));

  // 템플릿이 없으면 빈 옵션
  if (allTemplates.length === 0) {
    return { gold, cardOptions: [] };
  }

  // 카드 변형 생성 (classRestriction 없이 범용으로 생성 — 각 템플릿이 자체 classRestriction 보유)
  const actions = generateRewardFromTemplates(allTemplates, undefined, 5, seed);
  const rand = seededRand(seed + 5000);

  // Action → CardInstance 변환
  const cardOptions: CardInstance[] = actions.map((action) => ({
    instanceId: `card_${++cardInstanceCounter}`,
    templateId: action.id,
    action,
    classRestriction: action.classRestriction,
    rarity: action.rarity ?? Rarity.COMMON,
  }));

  return { gold, cardOptions };
}

// 캐릭터 획득 기본 확률
const BASE_CHARACTER_CHANCE = 0.3;
// 난이도별 확률 보너스
const DIFFICULTY_CHARACTER_BONUS: Record<string, number> = {
  [Difficulty.EASY]: 0.0,
  [Difficulty.STANDARD]: 0.05,
  [Difficulty.HARD]: 0.1,
  [Difficulty.NIGHTMARE]: 0.15,
};
// 로스터 크기당 확률 감소 (팀 크기 초과분에만 적용)
const ROSTER_PENALTY_PER_UNIT = 0.05;
const ROSTER_PENALTY_THRESHOLD = 3;

// 선택 가능한 클래스 목록 (ClassDefinitions에서 자동 파생)
const CHARACTER_CLASSES = getAvailableClasses();

/**
 * 객원 멤버 획득 기회 계산
 * 전투 승리 시 객원 캐릭터를 획득할 확률을 계산하고, 보상 생성
 * 결정론적: seed 기반
 */
export function generateCharacterReward(
  seed: number,
  difficulty: Difficulty,
  currentRosterSize: number,
): CharacterReward | null {
  const rand = seededRand(seed);

  // 확률 계산
  const diffBonus = DIFFICULTY_CHARACTER_BONUS[difficulty] ?? 0;
  const rosterPenalty = Math.max(0, currentRosterSize - ROSTER_PENALTY_THRESHOLD) * ROSTER_PENALTY_PER_UNIT;
  const probability = Math.max(0, BASE_CHARACTER_CHANCE + diffBonus - rosterPenalty);

  // 확률 판정
  if (rand() >= probability) return null;

  // 클래스 랜덤 선택
  const classIdx = Math.floor(rand() * CHARACTER_CLASSES.length);
  const characterClass = CHARACTER_CLASSES[classIdx];

  // 객원 캐릭터 생성
  const guestName = `Guest ${characterClass}`;
  const character = generateCharacterDef(guestName, characterClass, seed + 2000);

  return { character, isGuest: true, probability };
}

/**
 * 보상 적용 (골드 + 선택한 카드를 인벤토리에 추가)
 * 불변성: 새 RunState 반환
 */
export function applyReward(runState: RunState, reward: BattleReward, selectedCard?: CardInstance): RunState {
  const newGold = runState.gold + reward.gold;

  // 카드 미선택 시 골드만 반영
  if (!selectedCard) {
    return { ...runState, gold: newGold };
  }

  // 카드 인벤토리에 추가
  const newInventory = [...runState.cardInventory, selectedCard];

  return { ...runState, gold: newGold, cardInventory: newInventory };
}
