import { RunStatus } from '../types';
import type { RunState } from '../types';

export type FormationFlowContext = 'TOWN' | 'RUN_EDIT' | 'RUN_RETRY';
export type FormationSceneTarget = 'TownScene' | 'RunMapScene' | 'RunResultScene';

export interface FormationSceneData {
  isRetry?: boolean;
  defeatedByEnemies?: Array<{ name: string; characterClass: string; hp: number; maxHp: number }>;
  returnScene?: FormationSceneTarget;
}

export interface FormationFlowInput {
  runState?: RunState;
  isRetry?: boolean;
  returnScene?: FormationSceneTarget;
}

export function resolveFormationFlowContext(input: FormationFlowInput): FormationFlowContext {
  if (input.isRetry) return 'RUN_RETRY';
  if (input.runState && input.runState.status === RunStatus.IN_PROGRESS && input.returnScene === 'RunMapScene') {
    return 'RUN_EDIT';
  }
  return 'TOWN';
}

export function getFormationTopBarTitle(context: FormationFlowContext): string {
  if (context === 'RUN_RETRY') return '재도전 — 편성 수정';
  if (context === 'RUN_EDIT') return '런 중 — 편성 수정';
  return '작전실 — 편성';
}

export function getFormationBackButtonConfig(context: FormationFlowContext): {
  label: string;
  targetScene: FormationSceneTarget;
} {
  if (context === 'RUN_RETRY') {
    return { label: '포기 (런 종료)', targetScene: 'RunResultScene' };
  }
  if (context === 'RUN_EDIT') {
    return { label: '< 런 맵으로', targetScene: 'RunMapScene' };
  }
  return { label: '< 마을로', targetScene: 'TownScene' };
}

export function getFormationActionButtonConfig(context: FormationFlowContext): {
  label: string;
  targetScene: FormationSceneTarget;
} {
  if (context === 'RUN_RETRY') {
    return { label: '재도전 출격!', targetScene: 'RunMapScene' };
  }
  if (context === 'RUN_EDIT') {
    return { label: '편성 완료', targetScene: 'RunMapScene' };
  }
  return { label: '편성 완료', targetScene: 'TownScene' };
}

export function createRunMapFormationSceneData(): FormationSceneData {
  return {
    returnScene: 'RunMapScene',
  };
}
