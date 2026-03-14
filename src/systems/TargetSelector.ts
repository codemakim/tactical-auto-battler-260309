import { Position, Team } from '../types';
import type { BattleUnit, ActionTargetType } from '../types';

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
  return units.filter(u => u.isAlive);
}

/**
 * 타겟 선택. null이면 유효한 타겟 없음.
 */
export function selectTarget(
  source: BattleUnit,
  targetType: ActionTargetType,
  allUnits: BattleUnit[],
): BattleUnit | null {
  const enemyTeam = getEnemyTeam(source);

  switch (targetType) {
    case 'SELF':
      return source;

    case 'ENEMY_FRONT': {
      const frontCandidates = alive(allUnits).filter(
        u => u.team === enemyTeam && u.position === Position.FRONT,
      );
      // FRONT 우선, 없으면 BACK 폴백 (전열에 아무도 없으면 후열을 공격)
      const candidates = frontCandidates.length > 0
        ? frontCandidates
        : alive(allUnits).filter(u => u.team === enemyTeam);
      // AGI가 가장 높은 적 (동률 시 첫 번째)
      return candidates.sort((a, b) => b.stats.agi - a.stats.agi)[0] ?? null;
    }

    case 'ENEMY_BACK': {
      const backCandidates = alive(allUnits).filter(
        u => u.team === enemyTeam && u.position === Position.BACK,
      );
      // BACK 우선, 없으면 FRONT 폴백
      const candidates = backCandidates.length > 0
        ? backCandidates
        : alive(allUnits).filter(u => u.team === enemyTeam);
      return candidates.sort((a, b) => b.stats.agi - a.stats.agi)[0] ?? null;
    }

    case 'ENEMY_ANY': {
      const candidates = alive(allUnits).filter(u => u.team === enemyTeam);
      // HP가 가장 낮은 적 우선
      return candidates.sort((a, b) => a.stats.hp - b.stats.hp)[0] ?? null;
    }

    case 'ALLY_LOWEST_HP': {
      const candidates = alive(allUnits).filter(
        u => u.team === source.team && u.id !== source.id,
      );
      return candidates.sort((a, b) => a.stats.hp - b.stats.hp)[0] ?? null;
    }

    case 'ALLY_ANY': {
      const candidates = alive(allUnits).filter(
        u => u.team === source.team && u.id !== source.id,
      );
      return candidates[0] ?? null;
    }

    default:
      return null;
  }
}
