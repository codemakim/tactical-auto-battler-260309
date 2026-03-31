import { describe, expect, it } from 'vitest';
import { getRewardCardSlots, getRewardFooterLayout } from '../systems/RewardSceneLayout';

describe('RewardSceneLayout', () => {
  it('5장 보상 카드를 중앙 기준 평면 카드열로 배치한다', () => {
    const slots = getRewardCardSlots(5, 640, 270);

    expect(slots).toHaveLength(5);
    expect(slots[0].x).toBeLessThan(slots[1].x);
    expect(slots[1].x).toBeLessThan(slots[2].x);
    expect(slots[2].x).toBeLessThan(slots[3].x);
    expect(slots[3].x).toBeLessThan(slots[4].x);

    expect(slots[0].x).toBe(184);
    expect(slots[4].x).toBe(928);
    expect(slots[1].x - slots[0].x).toBe(186);
    expect(slots[2].x - slots[1].x).toBe(186);
    expect(slots[3].x - slots[2].x).toBe(186);
    expect(slots[4].x - slots[3].x).toBe(186);
    expect(slots[0].x).toBe(1280 - (slots[4].x + 168));
    expect(slots.every((slot) => slot.y === 270)).toBe(true);
    expect(slots.every((slot) => slot.rotation === 0)).toBe(true);
  });

  it('1장일 때는 중앙에 수평 배치한다', () => {
    const slots = getRewardCardSlots(1, 640, 270);

    expect(slots).toEqual([{ x: 556, y: 270, rotation: 0 }]);
  });

  it('푸터 버튼이 중앙 프레임 안쪽 정렬을 유지한다', () => {
    expect(getRewardFooterLayout(640, 566)).toEqual({
      y: 566,
      confirmX: 470,
      skipX: 670,
      proceedLabelY: 536,
    });
  });
});
