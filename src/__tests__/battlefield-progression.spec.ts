import { describe, expect, it } from 'vitest';
import { RunStatus } from '../types';
import {
  applyRunResultToBattlefieldProgress,
  createInitialBattlefieldProgress,
  getBattlefieldCardState,
  normalizeBattlefieldProgress,
} from '../systems/BattlefieldProgression';
import type { RunState } from '../types';

function createRunState(overrides: Partial<RunState> = {}): RunState {
  return {
    battlefieldId: 'plains',
    currentStage: 1,
    maxStages: 5,
    seed: 42,
    party: [],
    cardInventory: [],
    equippedCards: {},
    gold: 0,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: [],
    ...overrides,
  };
}

describe('BattlefieldProgression', () => {
  it('초기 전장 진행도는 초원만 해금되고 나머지는 잠겨 있다', () => {
    const progress = createInitialBattlefieldProgress();

    expect(progress.plains.unlocked).toBe(true);
    expect(progress.dark_forest.unlocked).toBe(false);
    expect(progress.ruined_fortress.unlocked).toBe(false);
  });

  it('변방 초원 첫 클리어 시 어둠의 숲이 해금된다', () => {
    const progress = applyRunResultToBattlefieldProgress(
      createInitialBattlefieldProgress(),
      createRunState({
        battlefieldId: 'plains',
        currentStage: 5,
        maxStages: 5,
        status: RunStatus.VICTORY,
      }),
    );

    expect(progress.plains.clearedOnce).toBe(true);
    expect(progress.plains.bestStageReached).toBe(5);
    expect(progress.dark_forest.unlocked).toBe(true);
    expect(progress.ruined_fortress.unlocked).toBe(false);
  });

  it('전투를 완주하지 못해도 최고 도달 스테이지는 기록하지만 해금은 하지 않는다', () => {
    const progress = applyRunResultToBattlefieldProgress(
      createInitialBattlefieldProgress(),
      createRunState({
        battlefieldId: 'plains',
        currentStage: 3,
        status: RunStatus.DEFEAT,
      }),
    );

    expect(progress.plains.bestStageReached).toBe(2);
    expect(progress.plains.clearedOnce).toBe(false);
    expect(progress.dark_forest.unlocked).toBe(false);
  });

  it('어둠의 숲 첫 클리어 시 폐허 요새가 해금된다', () => {
    const afterPlains = applyRunResultToBattlefieldProgress(
      createInitialBattlefieldProgress(),
      createRunState({
        battlefieldId: 'plains',
        currentStage: 5,
        maxStages: 5,
        status: RunStatus.VICTORY,
      }),
    );

    const afterForest = applyRunResultToBattlefieldProgress(
      afterPlains,
      createRunState({
        battlefieldId: 'dark_forest',
        currentStage: 5,
        maxStages: 5,
        status: RunStatus.VICTORY,
      }),
    );

    expect(afterForest.dark_forest.clearedOnce).toBe(true);
    expect(afterForest.ruined_fortress.unlocked).toBe(true);
  });

  it('Sortie 카드 상태는 진행도에 따라 잠금/기록을 계산한다', () => {
    const progress = applyRunResultToBattlefieldProgress(
      createInitialBattlefieldProgress(),
      createRunState({
        battlefieldId: 'plains',
        currentStage: 4,
        status: RunStatus.DEFEAT,
      }),
    );

    const plainsCard = getBattlefieldCardState('plains', progress);
    const forestCard = getBattlefieldCardState('dark_forest', progress);

    expect(plainsCard.locked).toBe(false);
    expect(plainsCard.recordText).toBe('최고 Stage 3');
    expect(forestCard.locked).toBe(true);
    expect(forestCard.unlockText).toContain('변방 초원');
  });

  it('저장된 unlocked 값이 틀려도 clearedOnce 기준으로 전장 해금을 다시 계산한다', () => {
    const progress = normalizeBattlefieldProgress({
      plains: { unlocked: false, clearedOnce: true, bestStageReached: 5 },
      dark_forest: { unlocked: false, clearedOnce: true, bestStageReached: 5 },
      ruined_fortress: { unlocked: false, clearedOnce: false, bestStageReached: 0 },
    });

    expect(progress.plains.unlocked).toBe(true);
    expect(progress.dark_forest.unlocked).toBe(true);
    expect(progress.ruined_fortress.unlocked).toBe(true);
  });
});
