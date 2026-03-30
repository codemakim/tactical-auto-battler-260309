import { describe, expect, it } from 'vitest';
import {
  BattleSpeed,
  getBattleSpeedConfig,
  getNextBattleSpeed,
  shouldAnimateAtBattleSpeed,
} from '../systems/BattleSpeed';

describe('BattleSpeed', () => {
  it('배속 토글은 1x -> 2x -> skip -> 1x 순환한다', () => {
    expect(getNextBattleSpeed(BattleSpeed.X1)).toBe(BattleSpeed.X2);
    expect(getNextBattleSpeed(BattleSpeed.X2)).toBe(BattleSpeed.SKIP);
    expect(getNextBattleSpeed(BattleSpeed.SKIP)).toBe(BattleSpeed.X1);
  });

  it('1x와 2x는 애니메이션을 사용하고 skip은 사용하지 않는다', () => {
    expect(shouldAnimateAtBattleSpeed(BattleSpeed.X1)).toBe(true);
    expect(shouldAnimateAtBattleSpeed(BattleSpeed.X2)).toBe(true);
    expect(shouldAnimateAtBattleSpeed(BattleSpeed.SKIP)).toBe(false);
  });

  it('배속별 타이밍 배율을 반환한다', () => {
    expect(getBattleSpeedConfig(BattleSpeed.X1)).toEqual({ label: '1x', timingScale: 1, animate: true });
    expect(getBattleSpeedConfig(BattleSpeed.X2)).toEqual({ label: '2x', timingScale: 0.5, animate: true });
    expect(getBattleSpeedConfig(BattleSpeed.SKIP)).toEqual({ label: 'Skip', timingScale: 0, animate: false });
  });
});
