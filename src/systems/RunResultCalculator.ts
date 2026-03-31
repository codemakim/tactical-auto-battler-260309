/**
 * 런 결과 계산 (순수 함수)
 *
 * 런 종료 시 결과 요약 데이터 추출 + 영속 상태 반영
 */

import type { RunState, RunResultData } from '../types';
import { RunStatus } from '../types';
import { endRun } from '../core/RunManager';
import type { GameStateManager } from '../core/GameState';

/**
 * 런 결과 데이터 계산
 *
 * @param runState - endRun 호출 전 상태 (골드/인벤토리가 남아있어야 함)
 */
export function calculateRunResult(runState: RunState): RunResultData {
  const victory = runState.status === RunStatus.VICTORY;

  // 클리어한 스테이지 수: 승리 시 전체, 패배 시 현재 스테이지 - 1
  const stagesCleared = victory ? runState.maxStages : Math.max(0, runState.currentStage - 1);

  return {
    victory,
    stagesCleared,
    maxStages: runState.maxStages,
    goldEarned: runState.gold,
  };
}

/**
 * 런 정산 — 영속 자원 반영 + 런 상태 제거
 *
 * @param runState - endRun 호출 전 상태
 * @param gameStateMgr - 게임 상태 매니저 (골드 반영, runState 제거)
 */
export function finalizeRun(runState: RunState, gameStateMgr: GameStateManager): void {
  // 골드를 영속 자원에 반영
  gameStateMgr.addGold(runState.gold);

  // 런 종료 처리 (파티 복원, 인벤토리 초기화)
  endRun(runState);

  // 런 상태 제거
  gameStateMgr.setRunState(undefined);
}
