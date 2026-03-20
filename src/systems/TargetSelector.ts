import { Position, Team, TargetSelect } from '../types';
import type { BattleUnit, ActionTargetType, BattleState } from '../types';

/**
 * 적 팀 가져오기
 */
function getEnemyTeam(unit: BattleUnit): Team {
  return unit.team === Team.PLAYER ? Team.ENEMY : Team.PLAYER;
}

/**
 * 살아있는 유닛 필터
 */
function alive(units: BattleUnit[]): BattleUnit[] {
  return units.filter((u) => u.isAlive);
}

/**
 * 복합 타겟 객체 기반 타겟 선택.
 * 파이프라인: side 필터 → position 필터(폴백) → select 기준 선택
 * null이면 유효한 타겟 없음.
 */
export function selectTarget(
  source: BattleUnit,
  targetType: ActionTargetType,
  allUnits: BattleUnit[],
  state?: BattleState,
): BattleUnit | null {
  // SELF
  if (targetType.side === 'SELF') return source;

  // 1. side 필터
  const team = targetType.side === 'ENEMY' ? getEnemyTeam(source) : source.team;

  let candidates = alive(allUnits).filter((u) => u.team === team);

  // ALLY는 본인 제외
  if (targetType.side === 'ALLY') {
    candidates = candidates.filter((u) => u.id !== source.id);
  }

  // 2. position 필터 (폴백: 해당 포지션 없으면 전체)
  if (targetType.position !== 'ANY') {
    const posFiltered = candidates.filter((u) => u.position === targetType.position);
    if (posFiltered.length > 0) {
      candidates = posFiltered;
    }
    // 폴백: posFiltered가 비면 candidates 그대로 사용
  }

  if (candidates.length === 0) return null;

  // 3. select 기준으로 최종 선택
  return selectByStrategy(candidates, targetType.select, state);
}

/**
 * 선택 전략에 따라 후보 중 1명 선택
 */
function selectByStrategy(candidates: BattleUnit[], select: string, state?: BattleState): BattleUnit | null {
  switch (select) {
    case TargetSelect.HIGHEST_AGI:
      return candidates.sort((a, b) => b.stats.agi - a.stats.agi)[0] ?? null;

    case TargetSelect.LOWEST_HP:
      return candidates.sort((a, b) => a.stats.hp - b.stats.hp)[0] ?? null;

    case TargetSelect.HIGHEST_ATK:
      return candidates.sort((a, b) => b.stats.atk - a.stats.atk)[0] ?? null;

    case TargetSelect.RANDOM:
      return candidates[Math.floor(Math.random() * candidates.length)] ?? null;

    case TargetSelect.FASTEST_TURN: {
      if (!state) {
        // state 없으면 HIGHEST_AGI 폴백
        return candidates.sort((a, b) => b.stats.agi - a.stats.agi)[0] ?? null;
      }
      const order = state.turnOrder;
      const currentTurnIndex = state.turn - 1; // turn은 1-based
      // 아직 행동 안 한 유닛 중 turnOrder 인덱스가 가장 작은 유닛
      const sorted = candidates.sort((a, b) => {
        const ai = order.indexOf(a.id);
        const bi = order.indexOf(b.id);
        // turnOrder에 없는 유닛은 뒤로
        const aIdx = ai === -1 ? Infinity : ai;
        const bIdx = bi === -1 ? Infinity : bi;
        return aIdx - bIdx;
      });
      return sorted[0] ?? null;
    }

    case TargetSelect.FIRST:
      return candidates[0] ?? null;

    default:
      return null;
  }
}
