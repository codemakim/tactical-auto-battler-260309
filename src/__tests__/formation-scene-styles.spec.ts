import { describe, expect, it } from 'vitest';
import {
  getCommandCardVisualState,
  getRosterItemVisualState,
  getUnitCardVisualState,
} from '../systems/FormationSceneStyles';

describe('FormationSceneStyles', () => {
  it('로스터 아이템 상태는 선택/편성 여부에 따라 일관된 팔레트를 반환한다', () => {
    expect(getRosterItemVisualState({ isSelected: true, isAssigned: false })).toMatchObject({
      backgroundColor: 0x2a3a4a,
      borderColor: 0xffcc00,
      borderWidth: 2,
    });
    expect(getRosterItemVisualState({ isSelected: false, isAssigned: true })).toMatchObject({
      backgroundColor: 0x1a2a3a,
      borderColor: 0x3b82f6,
      borderWidth: 1,
    });
  });

  it('유닛 카드와 커맨드 카드는 hover/selected 상태를 별도 스타일로 분리한다', () => {
    expect(getUnitCardVisualState(false)).toMatchObject({
      backgroundColor: 0x1e2844,
      borderColor: 0x334466,
      borderWidth: 1,
    });
    expect(getUnitCardVisualState(true)).toMatchObject({
      backgroundColor: 0x2a3a5a,
      borderColor: 0xffcc00,
      borderWidth: 2,
    });

    expect(getCommandCardVisualState(true)).toMatchObject({
      backgroundColor: 0x203d31,
      borderColor: 0x10b981,
    });
    expect(getCommandCardVisualState(false)).toMatchObject({
      backgroundColor: 0x181d2d,
      borderColor: 0x344866,
    });
  });
});
