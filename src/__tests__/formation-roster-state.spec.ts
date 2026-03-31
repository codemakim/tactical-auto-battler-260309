import { describe, expect, it } from 'vitest';
import type { CharacterDefinition } from '../types';
import { buildFormationRosterEntries } from '../systems/FormationRosterState';

function makeChar(id: string, name: string): CharacterDefinition {
  return {
    id,
    name,
    characterClass: 'WARRIOR',
    baseStats: { hp: 10, atk: 5, grd: 3, agi: 2 },
    baseActionSlots: [],
    trainingsUsed: 0,
    trainingPotential: 3,
  };
}

describe('FormationRosterState', () => {
  it('편성 여부와 선택 여부를 함께 계산한다', () => {
    const entries = buildFormationRosterEntries([makeChar('a', 'A'), makeChar('b', 'B')], new Set(['b']), 'a');

    expect(entries).toEqual([
      {
        character: expect.objectContaining({ id: 'a' }),
        isAssigned: false,
        isSelected: true,
      },
      {
        character: expect.objectContaining({ id: 'b' }),
        isAssigned: true,
        isSelected: false,
      },
    ]);
  });
});
