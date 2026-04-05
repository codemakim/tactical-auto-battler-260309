import type { BattleEvent } from '../types';

export const BattleAnimationMode = {
  MELEE: 'MELEE',
  PROJECTILE: 'PROJECTILE',
} as const;

export type BattleAnimationMode = (typeof BattleAnimationMode)[keyof typeof BattleAnimationMode];

export interface BattleAnimationProfile {
  mode: BattleAnimationMode;
  windupMs: number;
  strikeMs: number;
  recoverMs: number;
  backOffsetPx: number;
  forwardOffsetPx: number;
  recoilOffsetPx: number;
  hitPushPx: number;
  hitTiltDeg: number;
  hitDurationMs: number;
  projectileMinMs: number;
  projectileMaxMs: number;
  projectilePixelsPerMs: number;
  projectileColor: number;
}

const DEFAULT_MELEE_PROFILE: BattleAnimationProfile = {
  mode: BattleAnimationMode.MELEE,
  windupMs: 110,
  strikeMs: 125,
  recoverMs: 180,
  backOffsetPx: 8,
  forwardOffsetPx: 16,
  recoilOffsetPx: 0,
  hitPushPx: 8,
  hitTiltDeg: 10,
  hitDurationMs: 160,
  projectileMinMs: 0,
  projectileMaxMs: 0,
  projectilePixelsPerMs: 0,
  projectileColor: 0xffffff,
};

const DEFAULT_PROJECTILE_PROFILE: BattleAnimationProfile = {
  mode: BattleAnimationMode.PROJECTILE,
  windupMs: 90,
  strikeMs: 80,
  recoverMs: 150,
  backOffsetPx: 4,
  forwardOffsetPx: 5,
  recoilOffsetPx: 0,
  hitPushPx: 7,
  hitTiltDeg: 9,
  hitDurationMs: 150,
  projectileMinMs: 120,
  projectileMaxMs: 240,
  projectilePixelsPerMs: 1.45,
  projectileColor: 0xcdd8ff,
};

export function getBattleAnimationProfile(characterClass: string): BattleAnimationProfile {
  switch (characterClass) {
    case 'ARCHER':
      return {
        ...DEFAULT_PROJECTILE_PROFILE,
        projectileColor: 0xcfd9ff,
      };
    case 'CONTROLLER':
      return {
        ...DEFAULT_PROJECTILE_PROFILE,
        projectileMinMs: 140,
        projectileMaxMs: 260,
        projectilePixelsPerMs: 1.25,
        projectileColor: 0x9ed0ff,
      };
    case 'ASSASSIN':
      return {
        ...DEFAULT_MELEE_PROFILE,
        windupMs: 90,
        strikeMs: 110,
        recoverMs: 150,
        backOffsetPx: 7,
        forwardOffsetPx: 18,
      };
    case 'GUARDIAN':
      return {
        ...DEFAULT_MELEE_PROFILE,
        windupMs: 120,
        strikeMs: 135,
        recoverMs: 210,
        backOffsetPx: 7,
        forwardOffsetPx: 14,
        hitPushPx: 6,
        hitTiltDeg: 8,
      };
    case 'LANCER':
      return {
        ...DEFAULT_MELEE_PROFILE,
        windupMs: 105,
        strikeMs: 120,
        recoverMs: 170,
        backOffsetPx: 9,
        forwardOffsetPx: 18,
      };
    case 'WARRIOR':
    default:
      return DEFAULT_MELEE_PROFILE;
  }
}

export function getProjectileTravelMs(distancePx: number, profile: BattleAnimationProfile): number {
  if (profile.mode !== BattleAnimationMode.PROJECTILE) return 0;
  const raw = distancePx / profile.projectilePixelsPerMs;
  return clamp(Math.round(raw), profile.projectileMinMs, profile.projectileMaxMs);
}

export function getPrimaryEventTargetId(events: BattleEvent[], actorId?: string): string | undefined {
  const preferredTypes = [
    'DAMAGE_DEALT',
    'HEAL_APPLIED',
    'SHIELD_APPLIED',
    'BUFF_APPLIED',
    'DEBUFF_APPLIED',
    'UNIT_MOVED',
    'UNIT_PUSHED',
    'UNIT_SWAPPED',
  ] as const;

  for (const type of preferredTypes) {
    const match = events.find((event) => event.type === type && event.targetId && event.targetId !== actorId);
    if (match?.targetId) return match.targetId;
  }

  return events.find((event) => event.targetId && event.targetId !== actorId)?.targetId;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
