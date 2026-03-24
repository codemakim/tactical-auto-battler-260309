/**
 * 전투 결과 계산 (순수 함수)
 *
 * BattleState + RunState → BattleResultData
 * Phaser 의존 없이 테스트 가능한 로직만 담당
 */

import type { BattleState, RunState, BattleResultData, SurvivorInfo } from '../types';
import { Team, Difficulty } from '../types';
import { calculateGoldReward } from './BattleRewardSystem';

/**
 * 전투 결과 데이터 계산
 *
 * @param battleState - 완료된 전투 상태
 * @param runState - 현재 런 상태
 * @param difficulty - 난이도 (골드 계산용)
 */
export function calculateBattleResult(
  battleState: BattleState,
  runState: RunState,
  difficulty: Difficulty = Difficulty.STANDARD,
): BattleResultData {
  const victory = battleState.winner === Team.PLAYER;

  // 아군 유닛 분류
  const playerUnits = battleState.units.filter((u) => u.team === Team.PLAYER);
  const survivingAllies: SurvivorInfo[] = [];
  const fallenAllies: SurvivorInfo[] = [];

  for (const unit of playerUnits) {
    const info: SurvivorInfo = {
      name: unit.name,
      characterClass: unit.characterClass,
      currentHp: Math.max(0, unit.stats.hp),
      maxHp: unit.stats.maxHp,
    };
    if (unit.isAlive) {
      survivingAllies.push(info);
    } else {
      fallenAllies.push(info);
    }
  }

  return {
    victory,
    roundsElapsed: battleState.round,
    survivingAllies,
    fallenAllies,
    goldEarned: calculateGoldReward(battleState, difficulty),
    canRetry: !victory && runState.retryAvailable,
    currentStage: runState.currentStage,
    maxStages: runState.maxStages,
  };
}
