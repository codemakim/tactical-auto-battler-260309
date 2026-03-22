import type { BattleUnit, BattleState } from '../types';
import { selectAction } from '../systems/ActionResolver';

/**
 * 유닛이 이번 턴에 방어 행동(defensivePriority)을 실행할지 peek.
 * selectAction을 미리 호출하여 선택될 액션의 defensivePriority 확인.
 */
function hasDefensivePriority(unit: BattleUnit, state: BattleState): boolean {
  const slot = selectAction(unit, state);
  if (!slot || slot === 'STUNNED') return false;
  return slot.action.defensivePriority === true;
}

/**
 * 턴 순서 정렬 비교 함수.
 * 1차: defensivePriority 행동 유닛 먼저
 * 2차: AGI 높은 순
 * 3차: HP 비율 높은 순 (tiebreaker)
 */
function compareUnits(a: BattleUnit, b: BattleUnit, state: BattleState): number {
  const aDef = hasDefensivePriority(a, state) ? 1 : 0;
  const bDef = hasDefensivePriority(b, state) ? 1 : 0;
  if (bDef !== aDef) return bDef - aDef;
  if (b.stats.agi !== a.stats.agi) return b.stats.agi - a.stats.agi;
  const aRatio = a.stats.hp / a.stats.maxHp;
  const bRatio = b.stats.hp / b.stats.maxHp;
  return bRatio - aRatio;
}

/**
 * AGI + 방어 우선권 기반 턴 순서 계산.
 * 방어 행동 유닛이 먼저, 그 안에서 AGI 높은 순.
 * 동률 시 현재 HP 비율이 높은 쪽 우선.
 */
export function calculateTurnOrder(units: BattleUnit[], state: BattleState): string[] {
  return units
    .filter((u) => u.isAlive && !u.hasActedThisRound)
    .sort((a, b) => compareUnits(a, b, state))
    .map((u) => u.id);
}

/**
 * 전체 턴 순서 (라운드 시작 시 계산, 아직 안 움직인 유닛 전체)
 */
export function calculateFullTurnOrder(units: BattleUnit[], state: BattleState): string[] {
  return units
    .filter((u) => u.isAlive)
    .sort((a, b) => compareUnits(a, b, state))
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
