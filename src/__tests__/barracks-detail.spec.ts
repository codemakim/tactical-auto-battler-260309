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

    const detail = getCharacterDetailViewModel(character);

    expect(detail.title).toBe('Aldric');
    expect(detail.classLabel).toBe('Class: WARRIOR');
    expect(detail.trainingLabel).toBe('Training: 1/3');
    expect(detail.statsLabel).toBe('HP 53  ATK 12  GRD 7  AGI 6');
    expect(detail.actionSlots).toHaveLength(3);
    expect(detail.actionSlots[0].condition.type).toBe('POSITION_FRONT');
    expect(detail.actionSlots[0].action.name).toBe('Shield Bash');
    expect(detail.actionSlots[1].condition.type).toBe('HP_BELOW');
    expect(detail.actionSlots[2].condition.type).toBe('POSITION_BACK');
  });
});
