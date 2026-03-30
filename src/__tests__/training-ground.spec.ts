import { describe, expect, it } from 'vitest';
import { createCharacterDef } from '../entities/UnitFactory';
import { CharacterClass } from '../types';
import { applyTrainingToCharacter, getTrainingCharacterViewModel } from '../systems/TrainingGround';

describe('TrainingGround', () => {
  it('훈련 가능 캐릭터의 비용과 상태를 표시한다', () => {
    const character = createCharacterDef('Aldric', CharacterClass.WARRIOR, 1, 3);

    expect(getTrainingCharacterViewModel(character, 100)).toEqual({
      title: 'Aldric',
      trainingLabel: 'Training: 1/3',
      costLabel: 'Next Cost: 75G',
      statusLabel: '훈련 가능',
      options: [
        { stat: 'hp', label: 'HP +3', disabled: false },
        { stat: 'atk', label: 'ATK +1', disabled: false },
        { stat: 'grd', label: 'GRD +1', disabled: false },
        { stat: 'agi', label: 'AGI +1', disabled: false },
      ],
    });
  });

  it('훈련 적용 시 캐릭터 baseStats와 골드를 갱신한다', () => {
    const character = createCharacterDef('Aldric', CharacterClass.WARRIOR, 0, 3);
    const result = applyTrainingToCharacter(character, 100, 'atk');

    expect('error' in result).toBe(false);
    if ('error' in result) return;

    expect(result.character.baseStats.atk).toBe(13);
    expect(result.character.trainingsUsed).toBe(1);
    expect(result.remainingGold).toBe(50);
  });

  it('훈련 한도 도달 또는 골드 부족이면 버튼을 비활성화한다', () => {
    const exhausted = createCharacterDef('Exhausted', CharacterClass.WARRIOR, 3, 3);
    const poor = createCharacterDef('Poor', CharacterClass.WARRIOR, 0, 3);

    expect(getTrainingCharacterViewModel(exhausted, 999).options.every((option) => option.disabled)).toBe(true);
    expect(getTrainingCharacterViewModel(poor, 10).options.every((option) => option.disabled)).toBe(true);
  });
});
