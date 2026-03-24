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
 * updatedRunState에는 골드가 이미 적용되고 게스트가 bench에 추가된 상태.
 */
export function calculateRewardPhase(
  runState: RunState,
  battleState: BattleState,
): { rewardData: RewardPhaseData; updatedRunState: RunState } {
  const result: RewardResult = processVictory(runState, battleState);

  const rewardData: RewardPhaseData = {
    goldEarned: result.reward.gold,
    cardOptions: result.reward.cardOptions,
    guestReward: result.guestReward,
    currentStage: runState.currentStage,
    maxStages: runState.maxStages,
    isLastStage: runState.currentStage >= runState.maxStages,
  };

  return { rewardData, updatedRunState: result.runState };
}

/**
 * 보상 선택 적용
 *
 * 카드 선택 + 게스트 수락/거절 + 다음 스테이지 진행을 한번에 처리.
 *
 * @param runState - processVictory가 반환한 업데이트된 RunState (골드 적용 + 게스트 추가 완료)
 * @param selectedCard - 선택한 카드 (null이면 건너뛰기)
 * @param acceptGuest - 게스트 수락 여부 (게스트 없으면 무시)
 * @param guestCharacterId - 거절 시 제거할 게스트 캐릭터 ID
 */
export function applyRewardSelections(
  runState: RunState,
  selectedCard: CardInstance | null,
  acceptGuest: boolean,
  guestCharacterId?: string,
): RunState {
  let state = runState;

  // 카드 선택
  if (selectedCard) {
    state = selectCardReward(state, selectedCard);
  }

  // 게스트 거절 시 bench에서 제거
  if (!acceptGuest && guestCharacterId) {
    state = {
      ...state,
      bench: state.bench.filter((c) => c.id !== guestCharacterId),
    };
  }

  // 다음 스테이지 진행 (또는 런 완료)
  state = advanceStage(state);

  return state;
}
