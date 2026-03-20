import type { BattleUnit } from '../types';

/**
 * AGI 기반 턴 순서 계산.
 * AGI가 높을수록 먼저 행동. 동률 시 현재 HP 비율이 높은 쪽 우선.
 */
export function calculateTurnOrder(units: BattleUnit[]): string[] {
  return units
    .filter((u) => u.isAlive && !u.hasActedThisRound)
    .sort((a, b) => {
      if (b.stats.agi !== a.stats.agi) {
        return b.stats.agi - a.stats.agi;
      }
      // 동률: HP 비율 높은 쪽 우선
      const aRatio = a.stats.hp / a.stats.maxHp;
      const bRatio = b.stats.hp / b.stats.maxHp;
      return bRatio - aRatio;
    })
    .map((u) => u.id);
}

/**
 * 전체 턴 순서 (라운드 시작 시 계산, 아직 안 움직인 유닛 전체)
 */
export function calculateFullTurnOrder(units: BattleUnit[]): string[] {
  return units
    .filter((u) => u.isAlive)
    .sort((a, b) => {
      if (b.stats.agi !== a.stats.agi) {
        return b.stats.agi - a.stats.agi;
      }
      const aRatio = a.stats.hp / a.stats.maxHp;
      const bRatio = b.stats.hp / b.stats.maxHp;
      return bRatio - aRatio;
    })
    .map((u) => u.id);
}

/**
 * 특정 유닛의 턴을 앞으로 당기기 (히어로 개입용)
 */
export function accelerateUnit(turnOrder: string[], unitId: string): string[] {
  const idx = turnOrder.indexOf(unitId);
  if (idx <= 0) return turnOrder;

  const newOrder = [...turnOrder];
  newOrder.splice(idx, 1);
  newOrder.splice(Math.max(0, idx - 2), 0, unitId); // 2칸 앞으로
  return newOrder;
}

/**
 * 특정 유닛의 턴을 뒤로 미루기 (히어로 개입용)
 */
export function delayUnit(turnOrder: string[], unitId: string): string[] {
  const idx = turnOrder.indexOf(unitId);
  if (idx < 0 || idx >= turnOrder.length - 1) return turnOrder;

  const newOrder = [...turnOrder];
  newOrder.splice(idx, 1);
  newOrder.splice(Math.min(newOrder.length, idx + 2), 0, unitId); // 2칸 뒤로
  return newOrder;
}
