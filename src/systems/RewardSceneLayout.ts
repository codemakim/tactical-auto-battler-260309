export interface RewardCardSlotLayout {
  x: number;
  y: number;
  rotation: number;
}

export interface RewardFooterLayout {
  y: number;
  confirmX: number;
  skipX: number;
  proceedLabelY: number;
}

const CARD_SPREAD_X = 158;
const CARD_FAN_Y_STEP = 14;
const CARD_ROTATION_STEP = 3.5;

export function getRewardCardSlots(cardCount: number, centerX: number, baseY: number): RewardCardSlotLayout[] {
  if (cardCount <= 0) {
    return [];
  }

  const middleIndex = (cardCount - 1) / 2;

  return Array.from({ length: cardCount }, (_, index) => {
    const offset = index - middleIndex;
    return {
      x: centerX + offset * CARD_SPREAD_X,
      y: baseY + Math.abs(offset) * CARD_FAN_Y_STEP,
      rotation: offset * CARD_ROTATION_STEP,
    };
  });
}

export function getRewardFooterLayout(centerX: number, footerY: number): RewardFooterLayout {
  return {
    y: footerY,
    confirmX: centerX - 170,
    skipX: centerX + 30,
    proceedLabelY: footerY - 30,
  };
}
