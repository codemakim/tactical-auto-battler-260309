import { describe, expect, it } from 'vitest';
import type { CharacterDefinition } from '../types';
import { getFormationHeroHudText, getFormationSelectionHudCopy } from '../systems/FormationHudState';
import { createCharacterDef } from '../entities/UnitFactory';
import { CharacterClass } from '../types';

function makeChar(): CharacterDefinition {
  return {
    id: 'a',
    name: 'Aldric',
    characterClass: 'WARRIOR',
    baseStats: { hp: 53, atk: 12, grd: 7, agi: 6 },
    baseActionSlots: [],
    trainingsUsed: 0,
    trainingPotential: 3,
  };
}

describe('FormationHudState', () => {
  it('영웅 잠금 상태를 HUD 텍스트에 반영한다', () => {
    expect(getFormationHeroHudText('Commander', false)).toBe('Commander');
    expect(getFormationHeroHudText('Commander', true)).toBe('Commander  [LOCKED]');
    expect(getFormationHeroHudText(null, true)).toBe('');
  });

  it('선택 유닛 요약 텍스트를 생성한다', () => {
    const character = createCharacterDef('Aldric', CharacterClass.WARRIOR);
    expect(
      getFormationSelectionHudCopy({
        character,
        zoneLabel: 'FRONT',
      }),
    ).toEqual({
      meta: 'Aldric / WARRIOR  HP 53  ATK 12  GRD 7  AGI 6  LINE FRONT',
      actionSlots: character.baseActionSlots,
      emptyText: null,
    });
  });

  it('선택된 유닛이 없으면 기본 안내를 반환한다', () => {
    expect(getFormationSelectionHudCopy({})).toEqual({
      meta: '선택한 유닛 없음',
      actionSlots: [],
      emptyText: '로스터나 보드에서 유닛을 선택한 뒤 TACTICS에서 행동 카드를 조정하세요.',
    });
  });
});
