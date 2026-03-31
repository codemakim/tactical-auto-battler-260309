import { describe, expect, it } from 'vitest';
import { getRewardCardSlots, getRewardFooterLayout } from '../systems/RewardSceneLayout';

describe('RewardSceneLayout', () => {
  it('5장 보상 카드를 중앙 기준 팬 형태로 배치한다', () => {
    const slots = getRewardCardSlots(5, 640, 270);

    expect(slots).toHaveLength(5);
    expect(slots[0].x).toBeLessThan(slots[1].x);
    expect(slots[1].x).toBeLessThan(slots[2].x);
    expect(slots[2].x).toBeLessThan(slots[3].x);
    expect(slots[3].x).toBeLessThan(slots[4].x);

    expect(slots[2].x).toBe(640);
    expect(slots[2].y).toBeLessThan(slots[1].y);
    expect(slots[2].y).toBeLessThan(slots[3].y);
    expect(slots[0].rotation).toBeLessThan(0);
    expect(slots[4].rotation).toBeGreaterThan(0);
  });

  it('1장일 때는 중앙에 수평 배치한다', () => {
    const slots = getRewardCardSlots(1, 640, 270);

    expect(slots).toEqual([{ x: 640, y: 270, rotation: 0 }]);
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
