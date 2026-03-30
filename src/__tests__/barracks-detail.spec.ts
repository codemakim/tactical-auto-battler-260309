import { describe, expect, it } from 'vitest';
import { createCharacterDef } from '../entities/UnitFactory';
import { CharacterClass } from '../types';
import { getBarracksRosterSummary, getCharacterDetailViewModel } from '../systems/BarracksDetail';

describe('BarracksDetail', () => {
  it('보유 캐릭터 수를 현재/최대 형식으로 표시한다', () => {
    expect(getBarracksRosterSummary(4, 8)).toEqual({
      countLabel: '보유 캐릭터 4/8',
    });
  });

  it('캐릭터 상세에 클래스, 훈련, 스탯, 액션 슬롯을 포함한다', () => {
    const character = createCharacterDef('Aldric', CharacterClass.WARRIOR, 1, 3);

    expect(getCharacterDetailViewModel(character)).toEqual({
      title: 'Aldric',
      classLabel: 'Class: WARRIOR',
      trainingLabel: 'Training: 1/3',
      statsLabel: 'HP 53  ATK 12  GRD 7  AGI 6',
      actionsLabel: ['1. POSITION_FRONT -> Shield Bash', '2. HP_BELOW -> Fortify', '3. POSITION_BACK -> Advance'],
    });
  });
});
