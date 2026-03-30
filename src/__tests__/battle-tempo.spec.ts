import { describe, expect, it } from 'vitest';
import {
  ACTION_ANIMATION_DURATION_MS,
  NEXT_ACTION_DELAY_MS,
  RESULT_DELAY_MS,
  getAnimationFrameRateForDuration,
} from '../systems/BattleTempo';

describe('BattleTempo', () => {
  it('전투 템포 상수는 스펙 범위 안에 있다', () => {
    expect(ACTION_ANIMATION_DURATION_MS).toBeGreaterThanOrEqual(600);
    expect(ACTION_ANIMATION_DURATION_MS).toBeLessThanOrEqual(800);
    expect(RESULT_DELAY_MS).toBe(200);
    expect(NEXT_ACTION_DELAY_MS).toBeGreaterThanOrEqual(400);
    expect(NEXT_ACTION_DELAY_MS).toBeLessThanOrEqual(600);
  });

  it('애니메이션 길이와 목표 시간으로 frameRate를 계산한다', () => {
    expect(getAnimationFrameRateForDuration(14, 700)).toBe(20);
    expect(getAnimationFrameRateForDuration(28, 700)).toBe(40);
  });

  it('최소 frameRate는 1로 제한한다', () => {
    expect(getAnimationFrameRateForDuration(0, 700)).toBe(1);
  });
});
