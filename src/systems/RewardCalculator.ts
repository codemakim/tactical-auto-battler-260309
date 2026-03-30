/**
 * 보상 화면 계산 (순수 함수)
 *
 * processVictory → 표시 데이터 추출 + 선택 적용
 * Phaser 의존 없이 테스트 가능
 */

import type { RunState, BattleState, RewardPhaseData, CardInstance } from '../types';
import { processVictory, selectCardReward, advanceStage } from '../core/RunManager';
import type { RewardResult } from '../core/RunManager';

/**
 * 보상 화면 데이터 계산
 *
 * processVictory를 래핑하여 표시 데이터와 업데이트된 RunState를 함께 반환.
 * updatedRunState에는 골드가 이미 적용된 상태.
 */
export function calculateRewardPhase(
  runState: RunState,
  battleState: BattleState,
): { rewardData: RewardPhaseData; updatedRunState: RunState } {
  const result: RewardResult = processVictory(runState, battleState);

  const rewardData: RewardPhaseData = {
    goldEarned: result.reward.gold,
    cardOptions: result.reward.cardOptions,
    currentStage: runState.currentStage,
    maxStages: runState.maxStages,
    isLastStage: runState.currentStage >= runState.maxStages,
  };

  return { rewardData, updatedRunState: result.runState };
}

/**
 * 보상 선택 적용
 *
 * 카드 선택 + 다음 스테이지 진행을 한번에 처리.
 */
export function applyRewardSelections(runState: RunState, selectedCard: CardInstance | null): RunState {
  let state = runState;

  // 카드 선택
  if (selectedCard) {
    state = selectCardReward(state, selectedCard);
  }

  // 다음 스테이지 진행 (또는 런 완료)
  state = advanceStage(state);

  return state;
}
