/**
 * RunMapCalculator 테스트
 *
 * calculateStageNodes(): RunState → StageNodeState[] (순수 함수)
 */
import { describe, it, expect } from 'vitest';
import { calculateStageNodes } from '../systems/RunMapCalculator';
import { StageNodeStatus, RunStatus, Target } from '../types';
import type { RunState, CharacterDefinition } from '../types';

// === 헬퍼 ===

function createMockCharDef(id: string): CharacterDefinition {
  return {
    id,
    name: `Char-${id}`,
    characterClass: 'WARRIOR',
    baseStats: { hp: 100, atk: 10, grd: 5, agi: 10 },
    baseActionSlots: [
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'atk',
          name: 'Attack',
          description: 'Basic attack',
          effects: [{ type: 'DAMAGE', target: Target.ENEMY_FRONT, value: 1.0 }],
        },
      },
    ],
    trainingsUsed: 0,
    trainingPotential: 3,
  };
}

function createRunState(overrides: Partial<RunState> = {}): RunState {
  const party = [createMockCharDef('c1'), createMockCharDef('c2'), createMockCharDef('c3')];
  return {
    currentStage: 1,
    maxStages: 5,
    seed: 42,
    party,
    bench: [],
    cardInventory: [],
    equippedCards: {},
    gold: 0,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: party.map((p) => ({ ...p })),
    ...overrides,
  };
}

// === 테스트 ===

describe('calculateStageNodes', () => {
  it('첫 스테이지에서 노드 5개 반환', () => {
    const runState = createRunState({ currentStage: 1, maxStages: 5 });
    const nodes = calculateStageNodes(runState);

    expect(nodes).toHaveLength(5);
  });

  it('첫 스테이지: 1번 CURRENT, 2~4 UPCOMING, 5번 BOSS_UPCOMING', () => {
    const runState = createRunState({ currentStage: 1, maxStages: 5 });
    const nodes = calculateStageNodes(runState);

    expect(nodes[0]).toEqual({ stage: 1, status: StageNodeStatus.CURRENT });
    expect(nodes[1]).toEqual({ stage: 2, status: StageNodeStatus.UPCOMING });
    expect(nodes[2]).toEqual({ stage: 3, status: StageNodeStatus.UPCOMING });
    expect(nodes[3]).toEqual({ stage: 4, status: StageNodeStatus.UPCOMING });
    expect(nodes[4]).toEqual({ stage: 5, status: StageNodeStatus.BOSS_UPCOMING });
  });

  it('3스테이지: 1~2 COMPLETED, 3 CURRENT, 4 UPCOMING, 5 BOSS_UPCOMING', () => {
    const runState = createRunState({ currentStage: 3, maxStages: 5 });
    const nodes = calculateStageNodes(runState);

    expect(nodes[0].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[1].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[2].status).toBe(StageNodeStatus.CURRENT);
    expect(nodes[3].status).toBe(StageNodeStatus.UPCOMING);
    expect(nodes[4].status).toBe(StageNodeStatus.BOSS_UPCOMING);
  });

  it('보스 스테이지 (5): 1~4 COMPLETED, 5 BOSS_CURRENT', () => {
    const runState = createRunState({ currentStage: 5, maxStages: 5 });
    const nodes = calculateStageNodes(runState);

    expect(nodes[0].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[1].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[2].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[3].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[4]).toEqual({ stage: 5, status: StageNodeStatus.BOSS_CURRENT });
  });

  it('maxStages가 다른 경우 (3스테이지 런)', () => {
    const runState = createRunState({ currentStage: 2, maxStages: 3 });
    const nodes = calculateStageNodes(runState);

    expect(nodes).toHaveLength(3);
    expect(nodes[0].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[1].status).toBe(StageNodeStatus.CURRENT);
    expect(nodes[2].status).toBe(StageNodeStatus.BOSS_UPCOMING);
  });

  it('stage 번호가 순서대로 1부터 시작', () => {
    const runState = createRunState({ currentStage: 1, maxStages: 5 });
    const nodes = calculateStageNodes(runState);

    expect(nodes.map((n) => n.stage)).toEqual([1, 2, 3, 4, 5]);
  });

  it('2스테이지: 1 COMPLETED, 2 CURRENT', () => {
    const runState = createRunState({ currentStage: 2, maxStages: 5 });
    const nodes = calculateStageNodes(runState);

    expect(nodes[0].status).toBe(StageNodeStatus.COMPLETED);
    expect(nodes[1].status).toBe(StageNodeStatus.CURRENT);
  });
});
