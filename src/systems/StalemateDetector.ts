/**
 * 교착 방지 시스템 (stalemate-spec.md §22.1~§22.3)
 *
 * "관리자의 진노" — 플레이어 측 생존 유닛이 공격 수단을 완전히 상실하면
 * 카운트다운 시작, 해소되지 않으면 강제 패배
 */

import type { BattleState, BattleUnit, BattleEvent } from '../types';
import { Team } from '../types';
import { uid } from '../utils/uid';

/** 교착 카운트다운 초기값 */
const STALEMATE_COUNTDOWN = 3;

/**
 * 플레이어 측 생존 유닛이 DAMAGE 효과를 하나라도 보유하는지 검사
 * 정적 분석: 조건(condition) 충족 여부는 보지 않고, 액션 데이터만 확인
 */
export function hasAnyDamageCapability(units: BattleUnit[]): boolean {
  const playerAlive = units.filter((u) => u.team === Team.PLAYER && u.isAlive);
  if (playerAlive.length === 0) return false;

  for (const unit of playerAlive) {
    for (const slot of unit.actionSlots) {
      for (const effect of slot.action.effects) {
        if (effect.type === 'DAMAGE') return true;
      }
    }
  }
  return false;
}

/**
 * 라운드 시작 시 교착 상태를 검사하고 BattleState를 갱신
 * startRound() 내에서 호출
 */
export function checkStalemate(state: BattleState): {
  state: BattleState;
  events: BattleEvent[];
} {
  const events: BattleEvent[] = [];
  const hasDamage = hasAnyDamageCapability(state.units);

  // 교착 해소: 이전에 카운트다운 중이었으나 DAMAGE 능력 회복
  if (hasDamage && state.stalemateCountdown != null) {
    events.push({
      id: uid(),
      type: 'OVERSEER_WRATH_LIFTED',
      round: state.round,
      turn: 0,
      timestamp: Date.now(),
      data: { message: '관리자의 진노가 가라앉았다' },
    });
    return {
      state: { ...state, stalemateCountdown: undefined },
      events,
    };
  }

  // DAMAGE 능력 있음 → 교착 아님
  if (hasDamage) {
    return { state, events };
  }

  // 교착 감지 또는 카운트다운 진행
  if (state.stalemateCountdown == null) {
    // 최초 감지 → 카운트다운 시작
    events.push({
      id: uid(),
      type: 'OVERSEER_WRATH_WARNING',
      round: state.round,
      turn: 0,
      timestamp: Date.now(),
      data: { countdown: STALEMATE_COUNTDOWN, message: '관리자가 진노하고 있다' },
    });
    return {
      state: { ...state, stalemateCountdown: STALEMATE_COUNTDOWN },
      events,
    };
  }

  // 이미 카운트다운 중 → 1 감소
  const newCountdown = state.stalemateCountdown - 1;

  if (newCountdown <= 0) {
    // 카운트다운 종료 → 강제 패배
    events.push({
      id: uid(),
      type: 'BATTLE_END',
      round: state.round,
      turn: 0,
      timestamp: Date.now(),
      data: { winner: Team.ENEMY, reason: 'overseer_wrath' },
    });
    return {
      state: {
        ...state,
        stalemateCountdown: 0,
        isFinished: true,
        winner: Team.ENEMY,
        phase: 'BATTLE_END' as BattleState['phase'],
      },
      events,
    };
  }

  // 카운트다운 계속
  events.push({
    id: uid(),
    type: 'OVERSEER_WRATH_WARNING',
    round: state.round,
    turn: 0,
    timestamp: Date.now(),
    data: { countdown: newCountdown, message: `심판까지 ${newCountdown}라운드` },
  });
  return {
    state: { ...state, stalemateCountdown: newCountdown },
    events,
  };
}
