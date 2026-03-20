import type { BattleEvent, BattleState, BattleUnit } from '../types';

/**
 * 리플레이 스냅샷: 특정 시점의 전투 상태 요약
 */
export interface ReplaySnapshot {
  eventIndex: number;
  round: number;
  turn: number;
  units: BattleUnit[]; // 해당 시점의 유닛 상태 복사본
}

/**
 * 리플레이 데이터
 */
export interface ReplayData {
  events: BattleEvent[];
  snapshots: ReplaySnapshot[]; // 주요 시점 스냅샷 (라운드 시작마다)
}

/**
 * 전투 종료 후 리플레이 데이터 추출
 */
export function createReplayData(finalState: BattleState): ReplayData {
  const events = finalState.events;
  const snapshots: ReplaySnapshot[] = [];

  // 라운드 시작 이벤트마다 스냅샷을 만들기 위해
  // 실제로는 전투 중 매 라운드 시작 시 스냅샷을 저장해야 함
  // 여기서는 이벤트 로그 기반으로 재구성 가능하도록 이벤트만 보존

  return { events, snapshots };
}

/**
 * 전투 중 스냅샷 기록 (라운드 시작 시 호출)
 */
export function recordSnapshot(state: BattleState): ReplaySnapshot {
  return {
    eventIndex: state.events.length,
    round: state.round,
    turn: state.turn,
    units: state.units.map((u) => ({ ...u, stats: { ...u.stats } })),
  };
}

/**
 * 리플레이 탐색: 특정 이벤트 인덱스까지의 이벤트 목록
 */
export function getEventsUpTo(replay: ReplayData, eventIndex: number): BattleEvent[] {
  return replay.events.slice(0, eventIndex + 1);
}

/**
 * 리플레이 탐색: 특정 라운드의 이벤트만
 */
export function getEventsForRound(replay: ReplayData, round: number): BattleEvent[] {
  return replay.events.filter((e) => e.round === round);
}

/**
 * 이벤트 총 개수
 */
export function getTotalEvents(replay: ReplayData): number {
  return replay.events.length;
}
