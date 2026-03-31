import { describe, expect, it } from 'vitest';
import { Position } from '../types';
import type { CharacterDefinition } from '../types';
import type { FormationData } from '../core/GameState';
import { getBoardSlotMarkerStates, getCharactersInBoardZone } from '../systems/FormationBoardState';

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

describe('FormationBoardState', () => {
  it('존 키에 맞는 캐릭터만 반환한다', () => {
    const chars = [makeChar('a', 'A'), makeChar('b', 'B'), makeChar('c', 'C')];
    const formation: FormationData = {
      heroType: 'COMMANDER',
      slots: [
        { characterId: 'a', position: Position.FRONT },
        { characterId: 'b', position: Position.BACK },
        { characterId: 'c', position: Position.FRONT },
      ],
    };

    expect(getCharactersInBoardZone(formation, chars, 'FRONT').map((char) => char.id)).toEqual(['a', 'c']);
    expect(getCharactersInBoardZone(formation, chars, 'BACK').map((char) => char.id)).toEqual(['b']);
  });

  it('로스터에 없는 id와 빈 슬롯은 무시한다', () => {
    const chars = [makeChar('a', 'A')];
    const formation: FormationData = {
      heroType: 'COMMANDER',
      slots: [
        { characterId: 'a', position: Position.BACK },
        { characterId: 'missing', position: Position.BACK },
        { characterId: 'missing-front', position: Position.FRONT },
      ],
    };

    expect(getCharactersInBoardZone(formation, chars, 'BACK').map((char) => char.id)).toEqual(['a']);
    expect(getCharactersInBoardZone(formation, chars, 'FRONT')).toEqual([]);
  });

  it('빈 슬롯 마커는 남은 칸에만 표시한다', () => {
    expect(getBoardSlotMarkerStates(5, 0)).toEqual([true, true, true, true, true]);
    expect(getBoardSlotMarkerStates(5, 2)).toEqual([false, false, false, false, false]);
    expect(getBoardSlotMarkerStates(5, 5)).toEqual([false, false, false, false, false]);
  });
});
