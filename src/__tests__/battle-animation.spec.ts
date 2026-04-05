import { describe, expect, it } from 'vitest';
import {
  BattleAnimationMode,
  getBattleAnimationProfile,
  getPrimaryEventTargetId,
  getProjectileTravelMs,
} from '../systems/BattleAnimation';
import type { BattleEvent } from '../types';

function createEvent(overrides: Partial<BattleEvent>): BattleEvent {
  return {
    id: 'event-1',
    type: 'ACTION_EXECUTED',
    round: 1,
    turn: 1,
    timestamp: 0,
    ...overrides,
  };
}

describe('BattleAnimation', () => {
  it('classifies melee and projectile classes separately', () => {
    expect(getBattleAnimationProfile('WARRIOR').mode).toBe(BattleAnimationMode.MELEE);
    expect(getBattleAnimationProfile('LANCER').mode).toBe(BattleAnimationMode.MELEE);
    expect(getBattleAnimationProfile('ARCHER').mode).toBe(BattleAnimationMode.PROJECTILE);
    expect(getBattleAnimationProfile('CONTROLLER').mode).toBe(BattleAnimationMode.PROJECTILE);
  });

  it('scales projectile travel time by distance with clamp', () => {
    const profile = getBattleAnimationProfile('ARCHER');

    expect(getProjectileTravelMs(40, profile)).toBe(profile.projectileMinMs);
    expect(getProjectileTravelMs(240, profile)).toBeGreaterThan(profile.projectileMinMs);
    expect(getProjectileTravelMs(9999, profile)).toBe(profile.projectileMaxMs);
  });

  it('picks the primary non-self target from battle events', () => {
    const events = [
      createEvent({ type: 'ACTION_EXECUTED', sourceId: 'player-1', targetId: 'player-1' }),
      createEvent({ id: 'event-2', type: 'HEAL_APPLIED', sourceId: 'player-1', targetId: 'ally-1' }),
      createEvent({ id: 'event-3', type: 'DAMAGE_DEALT', sourceId: 'player-1', targetId: 'enemy-1' }),
    ];

    expect(getPrimaryEventTargetId(events, 'player-1')).toBe('enemy-1');
  });
});
