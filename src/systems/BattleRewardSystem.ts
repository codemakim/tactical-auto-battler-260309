import type { BattleState, RunState, BattleReward, Action, BattleUnit, ActionCondition, CharacterReward } from '../types';
import { Difficulty, Team } from '../types';
import { generateRewardOptions, replaceActionSlot } from './ActionCardSystem';
import { ACTION_POOL } from '../data/ActionPool';
import { getAvailableClasses } from '../data/ClassDefinitions';

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
const ROUND_PENALTY = 5;        // 기준 초과 라운드당 감소량
// 패배 시 골드 지급 비율
const DEFEAT_GOLD_RATIO = 0.3;

/**
 * 골드 보상 계산
 * 기본 골드 + 라운드 보너스 + 난이도 배율 적용
 * 패배 시 기본 보상의 일부만 지급
 */
export function calculateGoldReward(state: BattleState, difficulty: Difficulty): number {
  const multiplier = DIFFICULTY_GOLD_MULTIPLIER[difficulty] ?? 1.0;
  const roundBonus = Math.max(0, FAST_CLEAR_BONUS_BASE - Math.max(0, state.round - FAST_CLEAR_THRESHOLD) * ROUND_PENALTY);
  const baseReward = Math.round((BASE_GOLD + roundBonus) * multiplier);

  // 패배 시 일부만 지급
  if (state.winner === Team.ENEMY || (state.isFinished && state.winner !== Team.PLAYER)) {
    return Math.round(baseReward * DEFEAT_GOLD_RATIO);
  }

  return baseReward;
}

/**
 * 전투 보상 생성
 * 골드 계산 + 액션 카드 5개 옵션 생성 (클래스 호환 필터링 포함)
 * 결정론적: seed 기반
 *
 * characterClass를 지정하지 않으면 범용 액션만 포함된 풀에서 선택
 */
export function generateBattleRewards(
  state: BattleState,
  runState: RunState,
  seed: number,
): BattleReward {
  const gold = calculateGoldReward(state, runState.difficulty);

  // 플레이어 팀의 첫 번째 생존 유닛 클래스를 기준으로 액션 옵션 생성
  // (UI에서 유닛별로 선택할 수 있도록 옵션 생성은 단일 호출로 처리)
  const playerUnit = state.units.find((u) => u.team === Team.PLAYER && u.isAlive);
  const characterClass = playerUnit?.characterClass;

  const actionOptions = characterClass
    ? generateRewardOptions(ACTION_POOL, characterClass, 5, seed)
    : [];

  return { gold, actionOptions };
}

// 캐릭터 획득 기본 확률
const BASE_CHARACTER_CHANCE = 0.30;
// 난이도별 확률 보너스
const DIFFICULTY_CHARACTER_BONUS: Record<string, number> = {
  [Difficulty.EASY]: 0.0,
  [Difficulty.STANDARD]: 0.05,
  [Difficulty.HARD]: 0.10,
  [Difficulty.NIGHTMARE]: 0.15,
};
// 로스터 크기당 확률 감소 (팀 크기 초과분에만 적용)
const ROSTER_PENALTY_PER_UNIT = 0.05;
const ROSTER_PENALTY_THRESHOLD = 3;

// 선택 가능한 클래스 목록 (ClassDefinitions에서 자동 파생)
const CHARACTER_CLASSES = getAvailableClasses();

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

/**
 * 캐릭터 획득 기회 계산
 * 전투 승리 시 새 캐릭터를 획득할 확률을 계산하고, 보상 생성
 * 결정론적: seed 기반
 *
 * @param seed 랜덤 시드
 * @param difficulty 현재 난이도
 * @param currentRosterSize 현재 로스터 크기
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

  // 훈련 잠재력: 2~5 랜덤 (§23.5)
  const trainingPotential = 2 + Math.floor(rand() * 4);

  return { characterClass, trainingPotential, probability };
}

/**
 * 보상 적용
 * 골드를 RunState에 추가하고 선택한 액션 카드를 유닛 슬롯에 교체
 * 액션 미선택 시 골드만 적용
 * 불변성: 새 RunState 반환
 */
export function applyReward(
  runState: RunState,
  reward: BattleReward,
  selectedAction?: Action,
  targetUnit?: BattleUnit,
  slotIndex?: number,
  newCondition?: ActionCondition,
): RunState {
  const newGold = runState.gold + reward.gold;

  // 액션 미선택 시 골드만 반영
  if (!selectedAction || !targetUnit || slotIndex === undefined) {
    return { ...runState, gold: newGold };
  }

  const condition: ActionCondition = newCondition ?? { type: 'ALWAYS' };
  const updatedUnit = replaceActionSlot(targetUnit, slotIndex, selectedAction, condition);

  // 슬롯 교체 실패 시(유효하지 않은 인덱스 등) 골드만 반영
  if (!updatedUnit) {
    return { ...runState, gold: newGold };
  }

  // temporaryActions에 선택한 액션 추가 (RunState 추적용)
  const newTemporaryActions = [...runState.temporaryActions, selectedAction];

  return { ...runState, gold: newGold, temporaryActions: newTemporaryActions };
}
