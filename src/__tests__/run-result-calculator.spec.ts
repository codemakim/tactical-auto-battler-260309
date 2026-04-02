/**
 * RunResultCalculator 테스트
 *
 * calculateRunResult(): RunState → RunResultData (순수 함수)
 * finalizeRun(): 영속 자원 반영 + 런 상태 제거
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateRunResult, finalizeRun } from '../systems/RunResultCalculator';
import type { RunState, CharacterDefinition } from '../types';
import { RunStatus, Target } from '../types';
import type { GameStateManager } from '../core/GameState';

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
    cardInventory: [],
    equippedCards: {},
    gold: 0,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: party.map((p) => ({ ...p })),
    ...overrides,
  };
}

// === calculateRunResult 테스트 ===

describe('calculateRunResult', () => {
  it('승리 시 전체 스테이지 클리어로 반환', () => {
    const runState = createRunState({
      status: RunStatus.VICTORY,
      currentStage: 5,
      maxStages: 5,
      gold: 300,
      cardInventory: [],
    });

    const result = calculateRunResult(runState);

    expect(result.victory).toBe(true);
    expect(result.stagesCleared).toBe(5);
    expect(result.maxStages).toBe(5);
    expect(result.goldEarned).toBe(300);
  });

  it('패배 시 현재 스테이지 - 1 클리어', () => {
    const runState = createRunState({
      status: RunStatus.DEFEAT,
      currentStage: 3,
      maxStages: 5,
      gold: 150,
      cardInventory: [],
    });

    const result = calculateRunResult(runState);

    expect(result.victory).toBe(false);
    expect(result.stagesCleared).toBe(2);
    expect(result.maxStages).toBe(5);
    expect(result.goldEarned).toBe(150);
  });

  it('1스테이지에서 패배 시 클리어 0', () => {
    const runState = createRunState({
      status: RunStatus.DEFEAT,
      currentStage: 1,
      maxStages: 5,
      gold: 50,
      cardInventory: [],
    });

    const result = calculateRunResult(runState);

    expect(result.victory).toBe(false);
    expect(result.stagesCleared).toBe(0);
    expect(result.goldEarned).toBe(50);
  });

  it('골드 0, 카드 0인 경우 정상 처리', () => {
    const runState = createRunState({
      status: RunStatus.VICTORY,
      gold: 0,
      cardInventory: [],
    });

    const result = calculateRunResult(runState);

    expect(result.victory).toBe(true);
    expect(result.goldEarned).toBe(0);
  });
});

// === finalizeRun 테스트 ===

describe('finalizeRun', () => {
  let mockGameState: GameStateManager;

  beforeEach(() => {
    mockGameState = {
      addGold: vi.fn(),
      refreshRecruitShopAfterRun: vi.fn(),
      setRunState: vi.fn(),
    } as unknown as GameStateManager;
  });

  it('골드를 영속 자원에 반영', () => {
    const runState = createRunState({ gold: 250 });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.addGold).toHaveBeenCalledWith(250);
  });

  it('런 상태를 undefined로 제거', () => {
    const runState = createRunState();

    finalizeRun(runState, mockGameState);

    expect(mockGameState.setRunState).toHaveBeenCalledWith(undefined);
  });

  it('addGold → endRun → setRunState 순서로 실행', () => {
    const callOrder: string[] = [];
    mockGameState = {
      addGold: vi.fn(() => callOrder.push('addGold')),
      setRunState: vi.fn(() => callOrder.push('setRunState')),
    } as unknown as GameStateManager;

    const runState = createRunState({ gold: 100 });
    finalizeRun(runState, mockGameState);

    expect(callOrder[0]).toBe('addGold');
    expect(callOrder[callOrder.length - 1]).toBe('setRunState');
  });

  it('골드 0인 경우에도 addGold 호출', () => {
    const runState = createRunState({ gold: 0 });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.addGold).toHaveBeenCalledWith(0);
  });

  it('1스테이지 이상 클리어한 런 종료면 상점 자동 갱신을 요청한다', () => {
    const runState = createRunState({
      status: RunStatus.DEFEAT,
      currentStage: 3,
    });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.refreshRecruitShopAfterRun as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(2);
  });

  it('스테이지를 하나도 클리어하지 못한 런 종료면 상점 자동 갱신을 요청하지 않는다', () => {
    const runState = createRunState({
      status: RunStatus.DEFEAT,
      currentStage: 1,
    });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.refreshRecruitShopAfterRun as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });
});
