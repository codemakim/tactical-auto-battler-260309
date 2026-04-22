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
    expect(result.hiddenCount).toBe(2);
    expect(result.placements).toHaveLength(2);
  });

  it('말줄임 배지는 마지막 줄 안에서 기존 배지와 겹치지 않게 자리를 확보한다', () => {
    const result = calculateMiniCardBadgeLayout([46, 46, 46], {
      startX: 8,
      startY: 27,
      maxWidth: 100,
      gapX: 4,
      gapY: 3,
      badgeHeight: 16,
      maxRows: 1,
      overflowMarkerWidth: 22,
    });

    expect(result.overflowed).toBe(true);
    expect(result.hiddenCount).toBe(2);
    expect(result.overflowMarker).toEqual({ x: 58, y: 27, width: 22 });
    expect(result.overflowMarker!.x + result.overflowMarker!.width).toBeLessThanOrEqual(108);
  });

  it('단일 배지가 카드 폭보다 길면 카드 내부 폭으로 제한한다', () => {
    const result = calculateMiniCardBadgeLayout([180], {
      startX: 8,
      startY: 27,
      maxWidth: 100,
      gapX: 4,
      gapY: 3,
      badgeHeight: 16,
    });

    expect(result.placements[0]).toMatchObject({ x: 8, y: 27, width: 100 });
  });
});
