/**
 * 런 진행 맵 노드 상태 계산 (순수 함수)
 */

import type { RunState, StageNodeState } from '../types';
import { StageNodeStatus } from '../types';

/**
 * 런 상태로부터 각 스테이지의 노드 상태를 계산
 *
 * @param runState - 현재 런 상태
 * @returns 각 스테이지의 노드 상태 배열 (1~maxStages)
 */
export function calculateStageNodes(runState: RunState): StageNodeState[] {
  const nodes: StageNodeState[] = [];

  for (let stage = 1; stage <= runState.maxStages; stage++) {
    let status: StageNodeStatus;

    if (stage < runState.currentStage) {
      status = StageNodeStatus.COMPLETED;
    } else if (stage === runState.currentStage) {
      status = stage === runState.maxStages ? StageNodeStatus.BOSS_CURRENT : StageNodeStatus.CURRENT;
    } else {
      status = stage === runState.maxStages ? StageNodeStatus.BOSS_UPCOMING : StageNodeStatus.UPCOMING;
    }

    nodes.push({ stage, status });
  }

  return nodes;
}
