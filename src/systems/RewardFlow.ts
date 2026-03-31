import { createRunMapFormationSceneData } from './FormationFlow';
import type { FormationSceneData } from './FormationFlow';
import type { RunState } from '../types';

export interface RewardProceedTarget {
  scene: 'FormationScene' | 'RunResultScene';
  data?: FormationSceneData | { runState: RunState };
}

export function getRewardProceedTarget(isLastStage: boolean, runState: RunState): RewardProceedTarget {
  if (isLastStage) {
    return {
      scene: 'RunResultScene',
      data: { runState },
    };
  }

  return {
    scene: 'FormationScene',
    data: createRunMapFormationSceneData(),
  };
}
