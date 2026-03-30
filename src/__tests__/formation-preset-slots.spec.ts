import { describe, expect, it } from 'vitest';
import { HeroType, Position } from '../types';
import { getFormationPresetSlotName, getFormationPresetSlots } from '../systems/FormationPresetSlots';

describe('FormationPresetSlots', () => {
  it('프리셋 슬롯 이름을 Preset 1..3으로 고정한다', () => {
    expect(getFormationPresetSlotName(0)).toBe('Preset 1');
    expect(getFormationPresetSlotName(1)).toBe('Preset 2');
    expect(getFormationPresetSlotName(2)).toBe('Preset 3');
  });

  it('저장된 프리셋을 3개 슬롯 뷰모델로 매핑한다', () => {
    const slots = getFormationPresetSlots([
      {
        name: 'Preset 2',
        formation: {
          slots: [{ characterId: 'char_a', position: Position.FRONT }],
          heroType: HeroType.MAGE,
        },
      },
    ]);

    expect(slots).toEqual([
      { index: 0, name: 'Preset 1', filled: false, preset: undefined },
      {
        index: 1,
        name: 'Preset 2',
        filled: true,
        preset: {
          name: 'Preset 2',
          formation: {
            slots: [{ characterId: 'char_a', position: Position.FRONT }],
            heroType: HeroType.MAGE,
          },
        },
      },
      { index: 2, name: 'Preset 3', filled: false, preset: undefined },
    ]);
  });
});
