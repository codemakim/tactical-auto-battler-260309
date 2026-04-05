import { describe, expect, it } from 'vitest';
import { Position } from '../types';
import type { FormationData } from '../core/GameState';
import {
  moveCharacterToZone,
  removeCharacterFromFormation,
  replaceCharacterInFormation,
  swapCharactersInFormation,
} from '../systems/FormationInteraction';

function makeFormation(): FormationData {
  return {
    heroType: 'COMMANDER',
    slots: [
      { characterId: 'a', position: Position.FRONT },
      { characterId: 'b', position: Position.FRONT },
      { characterId: 'c', position: Position.BACK },
      { characterId: 'd', position: Position.BACK },
    ],
  };
}

describe('FormationInteraction', () => {
  it('편성된 캐릭터를 다른 존으로 이동시킨다', () => {
    const result = moveCharacterToZone(makeFormation(), 'a', 'BACK');

    expect(result.changed).toBe(true);
    expect(result.formation.slots.find((slot) => slot.characterId === 'a')?.position).toBe(Position.BACK);
  });

  it('빈 자리가 없으면 신규 캐릭터는 존에 추가되지 않는다', () => {
    const result = moveCharacterToZone(makeFormation(), 'e', 'FRONT');

    expect(result.changed).toBe(false);
    expect(result.reason).toBe('formation-full');
  });

  it('편성된 캐릭터를 해제할 수 있다', () => {
    const result = removeCharacterFromFormation(makeFormation(), 'b');

    expect(result.changed).toBe(true);
    expect(result.removedCharacterId).toBe('b');
    expect(result.formation.slots.find((slot) => slot.characterId === 'b')).toBeUndefined();
  });

  it('신규 캐릭터로 기존 캐릭터를 교체할 수 있다', () => {
    const result = replaceCharacterInFormation(makeFormation(), 'e', 'c');

    expect(result.changed).toBe(true);
    expect(result.removedCharacterId).toBe('c');
    expect(result.formation.slots.find((slot) => slot.characterId === 'e')?.position).toBe(Position.BACK);
    expect(result.formation.slots.find((slot) => slot.characterId === 'c')).toBeUndefined();
  });

  it('두 편성 캐릭터의 위치를 서로 바꿀 수 있다', () => {
    const result = swapCharactersInFormation(makeFormation(), 'a', 'c');

    expect(result.changed).toBe(true);
    expect(result.formation.slots.find((slot) => slot.characterId === 'a')?.position).toBe(Position.BACK);
    expect(result.formation.slots.find((slot) => slot.characterId === 'c')?.position).toBe(Position.FRONT);
  });
});
