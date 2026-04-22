export interface MiniCardBadgeLayoutConfig {
  startX: number;
  startY: number;
  maxWidth: number;
  gapX: number;
  gapY: number;
  badgeHeight: number;
  maxRows?: number;
  overflowMarkerWidth?: number;
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
  hiddenCount: number;
  overflowMarker?: MiniCardBadgePlacement;
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
  let hiddenCount = 0;

  for (let index = 0; index < badgeWidths.length; index += 1) {
    const badgeWidth = Math.min(badgeWidths[index]!, maxWidth);
    if (cursorX !== startX && cursorX + badgeWidth > startX + maxWidth) {
      if (maxRows !== undefined && row + 1 >= maxRows) {
        overflowed = true;
        hiddenCount = badgeWidths.length - index;
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

  let overflowMarker: MiniCardBadgePlacement | undefined;
  if (overflowed && config.overflowMarkerWidth !== undefined) {
    const markerWidth = Math.min(config.overflowMarkerWidth, maxWidth);
    let markerX = cursorX === startX ? startX : cursorX;
    const markerY = placements.at(-1)?.y ?? startY;

    while (placements.length > 0 && markerX + markerWidth > startX + maxWidth) {
      const removed = placements.at(-1);
      if (!removed || removed.y !== markerY) break;
      placements.pop();
      hiddenCount += 1;
      markerX = removed.x;
    }

    if (markerX + markerWidth <= startX + maxWidth) {
      overflowMarker = { x: markerX, y: markerY, width: markerWidth };
      cursorY = markerY;
    }
  }

  return {
    placements,
    rowsUsed: row + 1,
    overflowed,
    hiddenCount,
    overflowMarker,
    finalCursorY: cursorY,
  };
}
