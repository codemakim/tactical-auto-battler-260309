import type { BattlefieldId, BattlefieldProgressState, BattlefieldUnlockRule, RunState } from '../types';
import { BATTLEFIELDS } from '../data/Battlefields';
import { RunStatus } from '../types';

export interface BattlefieldCardState {
  locked: boolean;
  unlockText?: string;
  statusText: string;
  recordText?: string;
}

export function createInitialBattlefieldProgress(): BattlefieldProgressState {
  const base = {} as BattlefieldProgressState;

  for (const battlefield of BATTLEFIELDS) {
    base[battlefield.id] = {
      unlocked: false,
      clearedOnce: false,
      bestStageReached: 0,
    };
  }

  return resolveUnlockedFlags(base);
}

export function normalizeBattlefieldProgress(
  battlefieldProgress?: Partial<BattlefieldProgressState>,
): BattlefieldProgressState {
  const base = createInitialBattlefieldProgress();

  if (!battlefieldProgress) return base;

  for (const battlefield of BATTLEFIELDS) {
    const saved = battlefieldProgress[battlefield.id];
    if (!saved) continue;

    base[battlefield.id] = {
      unlocked: saved.unlocked,
      clearedOnce: saved.clearedOnce,
      bestStageReached: saved.bestStageReached,
    };
  }

  return resolveUnlockedFlags(base);
}

export function getStagesClearedForRun(runState: RunState): number {
  if (runState.status === RunStatus.VICTORY) return runState.maxStages;
  return Math.max(0, runState.currentStage - 1);
}

export function isUnlockRuleSatisfied(
  rule: BattlefieldUnlockRule,
  battlefieldProgress: BattlefieldProgressState,
): boolean {
  if (rule.type === 'STARTER') return true;
  return battlefieldProgress[rule.battlefieldId].clearedOnce;
}

function resolveUnlockedFlags(battlefieldProgress: BattlefieldProgressState): BattlefieldProgressState {
  const next = { ...battlefieldProgress };
  const definitionsById = Object.fromEntries(
    BATTLEFIELDS.map((battlefield) => [battlefield.id, battlefield]),
  ) as Record<BattlefieldId, (typeof BATTLEFIELDS)[number]>;
  const resolved = new Map<BattlefieldId, boolean>();

  function resolveBattlefieldUnlocked(id: BattlefieldId): boolean {
    if (resolved.has(id)) return resolved.get(id)!;

    const definition = definitionsById[id];
    const unlocked = isUnlockRuleSatisfied(definition.unlock, battlefieldProgress);
    resolved.set(id, unlocked);
    return unlocked;
  }

  for (const battlefield of BATTLEFIELDS) {
    next[battlefield.id] = {
      ...next[battlefield.id],
      unlocked: resolveBattlefieldUnlocked(battlefield.id),
    };
  }

  return next;
}

export function applyRunResultToBattlefieldProgress(
  battlefieldProgress: BattlefieldProgressState,
  runState: RunState,
): BattlefieldProgressState {
  const battlefieldId: BattlefieldId = runState.battlefieldId ?? 'plains';
  const stagesCleared = getStagesClearedForRun(runState);
  const next = {
    ...battlefieldProgress,
    [battlefieldId]: {
      ...battlefieldProgress[battlefieldId],
      bestStageReached: Math.max(battlefieldProgress[battlefieldId].bestStageReached, stagesCleared),
      clearedOnce: battlefieldProgress[battlefieldId].clearedOnce || runState.status === RunStatus.VICTORY,
    },
  };

  return resolveUnlockedFlags(next);
}

export function getBattlefieldCardState(
  battlefieldId: BattlefieldId,
  battlefieldProgress: BattlefieldProgressState,
): BattlefieldCardState {
  const battlefield = BATTLEFIELDS.find((entry) => entry.id === battlefieldId);
  if (!battlefield) {
    return { locked: true, statusText: '데이터 없음' };
  }

  const progress = battlefieldProgress[battlefieldId];
  if (!progress.unlocked) {
    return {
      locked: true,
      unlockText: battlefield.unlockLabel,
      statusText: '잠김',
      recordText: progress.bestStageReached > 0 ? `최고 Stage ${progress.bestStageReached}` : undefined,
    };
  }

  if (progress.clearedOnce) {
    return {
      locked: false,
      statusText: '클리어 완료',
      recordText: `최고 Stage ${progress.bestStageReached}`,
    };
  }

  return {
    locked: false,
    statusText: '출격 가능',
    recordText: progress.bestStageReached > 0 ? `최고 Stage ${progress.bestStageReached}` : '첫 클리어 도전',
  };
}
