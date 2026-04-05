import { describe, expect, it } from 'vitest';
import { CharacterClass, HeroType, Position } from '../types';
import { createCharacterDef } from '../entities/UnitFactory';
import { dismissCharacterFromState, getBarracksDismissState } from '../systems/BarracksDismissal';

describe('BarracksDismissal', () => {
  it('런이 없고 로스터가 5명 이상이면 방출 가능하다', () => {
    expect(
      getBarracksDismissState({
        hasActiveRun: false,
        rosterCount: 5,
        targetExists: true,
      }),
    ).toEqual({ canDismiss: true });
  });

  it('런 진행 중이면 방출 불가다', () => {
    expect(
      getBarracksDismissState({
        hasActiveRun: true,
        rosterCount: 6,
        targetExists: true,
      }),
    ).toMatchObject({ canDismiss: false, reason: 'run-active' });
  });

  it('로스터가 4명 이하이면 방출 불가다', () => {
    expect(
      getBarracksDismissState({
        hasActiveRun: false,
        rosterCount: 4,
        targetExists: true,
      }),
    ).toMatchObject({ canDismiss: false, reason: 'minimum-roster' });
  });

  it('방출 시 현재 편성과 모든 프리셋에서 캐릭터를 제거한다', () => {
    const alpha = createCharacterDef('Alpha', CharacterClass.WARRIOR, 1);
    const beta = createCharacterDef('Beta', CharacterClass.ARCHER, 2);
    const gamma = createCharacterDef('Gamma', CharacterClass.GUARDIAN, 3);
    const delta = createCharacterDef('Delta', CharacterClass.CONTROLLER, 4);
    const epsilon = createCharacterDef('Epsilon', CharacterClass.LANCER, 5);

    const result = dismissCharacterFromState(
      {
        characters: [alpha, beta, gamma, delta, epsilon],
        formation: {
          heroType: HeroType.COMMANDER,
          slots: [
            { characterId: alpha.id, position: Position.FRONT },
            { characterId: beta.id, position: Position.BACK },
          ],
        },
        presets: [
          {
            name: 'alpha',
            formation: {
              heroType: HeroType.MAGE,
              slots: [
                { characterId: beta.id, position: Position.BACK },
                { characterId: gamma.id, position: Position.FRONT },
              ],
            },
          },
        ],
      },
      beta.id,
    );

    expect(result.dismissed).toBe(true);
    expect(result.nextState.characters.map((character) => character.id)).not.toContain(beta.id);
    expect(result.nextState.formation.slots.map((slot) => slot.characterId)).not.toContain(beta.id);
    expect(result.nextState.presets[0].formation.slots.map((slot) => slot.characterId)).not.toContain(beta.id);
  });
});
