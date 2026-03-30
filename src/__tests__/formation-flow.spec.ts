/**
 * Formation flow contract tests
 *
 * P1-2 런 중 편성 조정 흐름의 Scene 전이 계약을 검증한다.
 * Phaser 렌더링이 아니라, Scene이 따라야 할 순수 네비게이션 규칙을 고정한다.
 */
import { describe, it, expect } from 'vitest';
import {
  resolveFormationFlowContext,
  getFormationTopBarTitle,
  getFormationBackButtonConfig,
  getFormationActionButtonConfig,
  createRunMapFormationSceneData,
} from '../systems/FormationFlow';
import { RunStatus } from '../types';
import type { RunState, CharacterDefinition } from '../types';

function createMockCharacter(id: string): CharacterDefinition {
  return {
    id,
    name: id,
    characterClass: 'WARRIOR',
    baseStats: { hp: 100, atk: 10, grd: 5, agi: 10 },
    baseActionSlots: [
      {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'atk',
          name: 'Attack',
          description: 'Basic attack',
          effects: [{ type: 'DAMAGE', value: 1.0 }],
        },
      },
    ],
    trainingsUsed: 0,
    trainingPotential: 3,
  };
}

function createRunState(overrides: Partial<RunState> = {}): RunState {
  const party = [createMockCharacter('c1'), createMockCharacter('c2')];
  return {
    currentStage: 2,
    maxStages: 5,
    seed: 42,
    party,
    bench: [],
    cardInventory: [],
    equippedCards: {},
    gold: 100,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: party.map((char) => ({ ...char })),
    ...overrides,
  };
}

describe('resolveFormationFlowContext', () => {
  it('런 중 RunMap에서 진입하면 RUN_EDIT 모드다', () => {
    const context = resolveFormationFlowContext({
      runState: createRunState(),
      returnScene: 'RunMapScene',
    });

    expect(context).toBe('RUN_EDIT');
  });

  it('재도전 진입이면 RUN_RETRY 모드가 우선한다', () => {
    const context = resolveFormationFlowContext({
      runState: createRunState(),
      returnScene: 'RunMapScene',
      isRetry: true,
    });

    expect(context).toBe('RUN_RETRY');
  });

  it('런이 없으면 TOWN 모드다', () => {
    const context = resolveFormationFlowContext({});
    expect(context).toBe('TOWN');
  });
});

describe('FormationScene navigation contract', () => {
  it('RUN_EDIT 모드는 런 편집 제목과 RunMap 복귀를 사용한다', () => {
    const mode = resolveFormationFlowContext({
      runState: createRunState(),
      returnScene: 'RunMapScene',
    });

    expect(getFormationTopBarTitle(mode)).toBe('런 중 — 편성 수정');
    expect(getFormationBackButtonConfig(mode)).toEqual({
      label: '< 런 맵으로',
      targetScene: 'RunMapScene',
    });
    expect(getFormationActionButtonConfig(mode)).toEqual({
      label: '편성 완료',
      targetScene: 'RunMapScene',
    });
  });

  it('RUN_RETRY 모드는 재도전 전용 버튼 구성을 사용한다', () => {
    const mode = resolveFormationFlowContext({
      runState: createRunState(),
      isRetry: true,
    });

    expect(getFormationTopBarTitle(mode)).toBe('재도전 — 편성 수정');
    expect(getFormationBackButtonConfig(mode)).toEqual({
      label: '포기 (런 종료)',
      targetScene: 'RunResultScene',
    });
    expect(getFormationActionButtonConfig(mode)).toEqual({
      label: '재도전 출격!',
      targetScene: 'RunMapScene',
    });
  });

  it('TOWN 모드는 기존 마을 편성 흐름을 유지한다', () => {
    const mode = resolveFormationFlowContext({});

    expect(getFormationTopBarTitle(mode)).toBe('작전실 — 편성');
    expect(getFormationBackButtonConfig(mode)).toEqual({
      label: '< 마을로',
      targetScene: 'TownScene',
    });
    expect(getFormationActionButtonConfig(mode)).toEqual({
      label: '편성 완료',
      targetScene: 'TownScene',
    });
  });
});

describe('createRunMapFormationSceneData', () => {
  it('RunMapScene은 FormationScene에 RunMap 복귀 컨텍스트를 전달한다', () => {
    expect(createRunMapFormationSceneData()).toEqual({
      returnScene: 'RunMapScene',
    });
  });
});
