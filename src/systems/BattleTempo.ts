export const ACTION_ANIMATION_DURATION_MS = 700;
export const RESULT_DELAY_MS = 200;
export const NEXT_ACTION_DELAY_MS = 500;

export function getAnimationFrameRateForDuration(frameCount: number, durationMs: number): number {
  if (frameCount <= 0 || durationMs <= 0) return 1;
  return Math.max(1, Math.round((frameCount * 1000) / durationMs));
}
