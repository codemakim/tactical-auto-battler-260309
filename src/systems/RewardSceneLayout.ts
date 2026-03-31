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

const CARD_WIDTH = 168;
const CARD_GAP = 18;
const CARD_SPREAD_X = CARD_WIDTH + CARD_GAP;

export function getRewardCardSlots(cardCount: number, centerX: number, baseY: number): RewardCardSlotLayout[] {
  if (cardCount <= 0) {
    return [];
  }

  const totalWidth = cardCount * CARD_WIDTH + (cardCount - 1) * CARD_GAP;
  const startX = Math.round(centerX - totalWidth / 2);

  return Array.from({ length: cardCount }, (_, index) => {
    return {
      x: startX + index * CARD_SPREAD_X,
      y: baseY,
      rotation: 0,
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
