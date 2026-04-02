export interface MiniCardBadgeLayoutConfig {
  startX: number;
  startY: number;
  maxWidth: number;
  gapX: number;
  gapY: number;
  badgeHeight: number;
  maxRows?: number;
}

export interface MiniCardBadgePlacement {
  x: number;
  y: number;
  width: number;
}

export interface MiniCardBadgeLayoutResult {
  placements: MiniCardBadgePlacement[];
  rowsUsed: number;
  overflowed: boolean;
  finalCursorY: number;
}

export function calculateMiniCardBadgeLayout(
  badgeWidths: number[],
  config: MiniCardBadgeLayoutConfig,
): MiniCardBadgeLayoutResult {
  const { startX, startY, maxWidth, gapX, gapY, badgeHeight, maxRows } = config;

  const placements: MiniCardBadgePlacement[] = [];
  let cursorX = startX;
  let cursorY = startY;
  let row = 0;
  let overflowed = false;

  for (const badgeWidth of badgeWidths) {
    if (cursorX !== startX && cursorX + badgeWidth > startX + maxWidth) {
      if (maxRows !== undefined && row + 1 >= maxRows) {
        overflowed = true;
        break;
      }
      cursorX = startX;
      cursorY += badgeHeight + gapY;
      row += 1;
    }

    placements.push({
      x: cursorX,
      y: cursorY,
      width: badgeWidth,
    });
    cursorX += badgeWidth + gapX;
  }

  return {
    placements,
    rowsUsed: row + 1,
    overflowed,
    finalCursorY: cursorY,
  };
}
