import { BuffType, Position } from '../types';
import type { BattleUnit } from '../types';

/**
 * §25.2 커버 유닛 탐색
 * 후열 타겟이 공격받을 때, 같은 팀 전열에 COVER 버프를 가진 유닛이 대신 피격.
 * 조건: 같은 팀 + 전열 + COVER 버프 + 생존 + 본인이 아님
 * 여러 명이면 AGI 높은 유닛 우선.
 * 타겟이 전열이면 null (커버 불필요).
 */
export function findCoverUnit(
  target: BattleUnit,
  allUnits: BattleUnit[],
): BattleUnit | null {
  // §25.5 타겟이 전열이면 커버 발동 안 함
  if (target.position === Position.FRONT) return null;

  const candidates = allUnits.filter(u =>
    u.id !== target.id &&
    u.team === target.team &&
    u.position === Position.FRONT &&
    u.isAlive &&
    u.buffs.some(b => b.type === BuffType.COVER),
  );

  if (candidates.length === 0) return null;

  // §25.4 AGI 높은 유닛 우선
  candidates.sort((a, b) => b.stats.agi - a.stats.agi);
  return candidates[0];
}
