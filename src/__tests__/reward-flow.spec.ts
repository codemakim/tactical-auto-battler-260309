import { describe, expect, it } from 'vitest';
import { CharacterClass, RunStatus } from '../types';
import type { CharacterDefinition, RunState } from '../types';
import { createCharacterDef } from '../entities/UnitFactory';
import { getRewardProceedTarget } from '../systems/RewardFlow';

function makeParty(): CharacterDefinition[] {
  return [
    createCharacterDef('Warrior', CharacterClass.WARRIOR),
    createCharacterDef('Archer', CharacterClass.ARCHER),
    createCharacterDef('Guardian', CharacterClass.GUARDIAN),
    createCharacterDef('Assassin', CharacterClass.ASSASSIN),
  ];
}

function makeRunState(): RunState {
  const party = makeParty();
  return {
    currentStage: 2,
    maxStages: 5,
    seed: 42,
    party,
    cardInventory: [],
    equippedCards: {},
    artifactIds: [],
    gold: 10,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: party.map((character) => ({ ...character })),
  };
}

describe('RewardFlow', () => {
  it('마지막 스테이지가 아니면 다음 스테이지 편성을 위해 FormationScene으로 간다', () => {
    expect(getRewardProceedTarget(false, makeRunState())).toEqual({
      scene: 'FormationScene',
      data: {
        returnScene: 'RunMapScene',
      },
    });
  });

  it('마지막 스테이지면 RunResultScene으로 간다', () => {
    const runState = makeRunState();
    expect(getRewardProceedTarget(true, runState)).toEqual({
      scene: 'RunResultScene',
      data: { runState },
    });
  });
});
