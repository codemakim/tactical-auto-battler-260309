import { describe, expect, it } from 'vitest';
import { calculateMiniCardBadgeLayout } from '../ui/ActionMiniCardLayout';

describe('ActionMiniCardLayout', () => {
  it('배지가 넘치면 다음 줄로 내린다', () => {
    const result = calculateMiniCardBadgeLayout([40, 44, 52], {
      startX: 8,
      startY: 27,
      maxWidth: 100,
      gapX: 4,
      gapY: 3,
      badgeHeight: 16,
    });

    expect(result.rowsUsed).toBe(2);
    expect(result.placements[0].y).toBe(27);
    expect(result.placements[2].y).toBeGreaterThan(27);
  });

  it('최대 줄 수가 있으면 overflow 상태를 반환한다', () => {
    const result = calculateMiniCardBadgeLayout([50, 50, 50, 50], {
      startX: 8,
      startY: 27,
      maxWidth: 100,
      gapX: 4,
      gapY: 3,
      badgeHeight: 16,
      maxRows: 2,
    });

    expect(result.rowsUsed).toBe(2);
    expect(result.overflowed).toBe(true);
    expect(result.placements).toHaveLength(2);
  });
});
