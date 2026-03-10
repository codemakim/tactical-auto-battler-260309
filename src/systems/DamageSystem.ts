import type { BattleUnit, BattleEvent } from '../types';
import { uid } from '../utils/uid';
import { getEffectiveStats } from './BuffSystem';

/**
 * 데미지 계산: 유효 ATK 기반 배율 - 유효 DEF 감산, 최소 1
 */
export function calculateDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  multiplier: number,
): number {
  const atkStats = getEffectiveStats(attacker);
  const defStats = getEffectiveStats(defender);
  const raw = Math.floor(atkStats.atk * multiplier);
  const reduced = raw - defStats.def;
  return Math.max(1, reduced);
}

/**
 * 유닛에 데미지 적용. shield 먼저 소모.
 * 변경된 유닛과 이벤트를 반환 (순수 함수).
 */
export function applyDamage(
  unit: BattleUnit,
  amount: number,
  sourceId: string,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  let remaining = amount;

  // shield 먼저 소모
  let newShield = unit.shield;
  if (newShield > 0) {
    const absorbed = Math.min(newShield, remaining);
    newShield -= absorbed;
    remaining -= absorbed;
  }

  const newHp = Math.max(0, unit.stats.hp - remaining);
  const isDead = newHp <= 0;

  events.push({
    id: uid(),
    type: 'DAMAGE_DEALT',
    round,
    turn,
    timestamp: Date.now(),
    sourceId,
    targetId: unit.id,
    value: amount,
    data: { shieldBefore: unit.shield, hpBefore: unit.stats.hp, hpAfter: newHp },
  });

  const updated: BattleUnit = {
    ...unit,
    shield: newShield,
    stats: { ...unit.stats, hp: newHp },
    isAlive: !isDead,
  };

  if (isDead) {
    events.push({
      id: uid(),
      type: 'UNIT_DIED',
      round,
      turn,
      timestamp: Date.now(),
      targetId: unit.id,
    });
  }

  return { unit: updated, events };
}

/**
 * 실드 적용
 */
export function applyShield(
  unit: BattleUnit,
  amount: number,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  const updated: BattleUnit = {
    ...unit,
    shield: unit.shield + amount,
  };

  return {
    unit: updated,
    events: [{
      id: uid(),
      type: 'SHIELD_APPLIED',
      round,
      turn,
      timestamp: Date.now(),
      targetId: unit.id,
      value: amount,
    }],
  };
}

/**
 * HP 회복
 */
export function applyHeal(
  unit: BattleUnit,
  amount: number,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  const newHp = Math.min(unit.stats.maxHp, unit.stats.hp + amount);

  return {
    unit: { ...unit, stats: { ...unit.stats, hp: newHp } },
    events: [{
      id: uid(),
      type: 'HEAL_APPLIED',
      round,
      turn,
      timestamp: Date.now(),
      targetId: unit.id,
      value: newHp - unit.stats.hp,
    }],
  };
}
