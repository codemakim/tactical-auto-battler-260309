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
    battlefieldId: 'plains',
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
      finalizeRunMeta: vi.fn(),
    } as unknown as GameStateManager;
  });

  it('정산 요약을 메타 상태에 일괄 반영한다', () => {
    const runState = createRunState({ gold: 250 });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.finalizeRunMeta as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(runState, 0);
  });

  it('런 상태를 undefined로 제거', () => {
    const runState = createRunState({ currentStage: 2, status: RunStatus.DEFEAT });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.finalizeRunMeta as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(runState, 1);
  });

  it('endRun 뒤에 메타 정산을 실행한다', () => {
    const callOrder: string[] = [];
    mockGameState = {
      finalizeRunMeta: vi.fn(() => callOrder.push('finalizeRunMeta')),
    } as unknown as GameStateManager;

    const runState = createRunState({ gold: 100 });
    finalizeRun(runState, mockGameState);

    expect(callOrder).toEqual(['finalizeRunMeta']);
  });

  it('런 종료 시 전장 진행도 갱신을 요청한다', () => {
    const runState = createRunState({
      battlefieldId: 'dark_forest',
      currentStage: 5,
      maxStages: 5,
      status: RunStatus.VICTORY,
    });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.finalizeRunMeta as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(runState, 5);
  });

  it('골드 0인 경우에도 정산을 호출한다', () => {
    const runState = createRunState({ gold: 0 });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.finalizeRunMeta as ReturnType<typeof vi.fn>).toHaveBeenCalled();
  });

  it('1스테이지 이상 클리어한 런 종료면 상점 자동 갱신을 요청한다', () => {
    const runState = createRunState({
      status: RunStatus.DEFEAT,
      currentStage: 3,
    });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.finalizeRunMeta as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(runState, 2);
  });

  it('스테이지를 하나도 클리어하지 못한 런 종료면 상점 자동 갱신을 요청하지 않는다', () => {
    const runState = createRunState({
      status: RunStatus.DEFEAT,
      currentStage: 1,
    });

    finalizeRun(runState, mockGameState);

    expect(mockGameState.finalizeRunMeta as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(runState, 0);
  });
});
