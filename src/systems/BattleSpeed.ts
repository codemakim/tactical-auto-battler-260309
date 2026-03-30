export const BattleSpeed = {
  X1: 'X1',
  X2: 'X2',
  SKIP: 'SKIP',
} as const;

export type BattleSpeed = (typeof BattleSpeed)[keyof typeof BattleSpeed];

export function getNextBattleSpeed(speed: BattleSpeed): BattleSpeed {
  if (speed === BattleSpeed.X1) return BattleSpeed.X2;
  if (speed === BattleSpeed.X2) return BattleSpeed.SKIP;
  return BattleSpeed.X1;
}

export function getBattleSpeedConfig(speed: BattleSpeed): { label: string; timingScale: number; animate: boolean } {
  if (speed === BattleSpeed.X2) {
    return { label: '2x', timingScale: 0.5, animate: true };
  }
  if (speed === BattleSpeed.SKIP) {
    return { label: 'Skip', timingScale: 0, animate: false };
  }
  return { label: '1x', timingScale: 1, animate: true };
}

export function shouldAnimateAtBattleSpeed(speed: BattleSpeed): boolean {
  return getBattleSpeedConfig(speed).animate;
}
