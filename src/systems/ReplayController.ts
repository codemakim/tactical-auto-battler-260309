import type { TickSnapshot } from '../types';

/**
 * 리플레이 네비게이션 상태
 */
export interface ReplayState {
  snapshots: TickSnapshot[];
  currentTick: number;
  playing: boolean;
  playbackSpeed: number;
}

export function createReplayState(snapshots: TickSnapshot[]): ReplayState {
  return {
    snapshots,
    currentTick: 0,
    playing: false,
    playbackSpeed: 1,
  };
}

export function nextTick(state: ReplayState): ReplayState {
  const maxTick = state.snapshots.length - 1;
  if (state.currentTick >= maxTick) {
    return { ...state, playing: false };
  }
  const newTick = state.currentTick + 1;
  return {
    ...state,
    currentTick: newTick,
    playing: newTick >= maxTick ? false : state.playing,
  };
}

export function prevTick(state: ReplayState): ReplayState {
  if (state.currentTick <= 0) return state;
  return { ...state, currentTick: state.currentTick - 1 };
}

export function jumpToTick(state: ReplayState, tick: number): ReplayState {
  const maxTick = state.snapshots.length - 1;
  const clamped = Math.max(0, Math.min(tick, maxTick));
  return { ...state, currentTick: clamped };
}

export function jumpToRound(state: ReplayState, round: number): ReplayState {
  // 해당 라운드 첫 틱 찾기
  const idx = state.snapshots.findIndex((s) => s.round === round);
  if (idx !== -1) {
    return { ...state, currentTick: idx };
  }

  // 없으면 가장 가까운 라운드의 첫 틱
  const rounds = [...new Set(state.snapshots.map((s) => s.round))].sort((a, b) => a - b);
  const closest = rounds.reduce((prev, curr) => (Math.abs(curr - round) < Math.abs(prev - round) ? curr : prev));
  const closestIdx = state.snapshots.findIndex((s) => s.round === closest);
  return { ...state, currentTick: closestIdx };
}

export function togglePlay(state: ReplayState): ReplayState {
  if (!state.playing) {
    // 마지막 틱에서 재생 시작 → 처음으로
    if (state.currentTick >= state.snapshots.length - 1) {
      return { ...state, playing: true, currentTick: 0 };
    }
    return { ...state, playing: true };
  }
  return { ...state, playing: false };
}

export function setSpeed(state: ReplayState, speed: number): ReplayState {
  return { ...state, playbackSpeed: speed };
}

export function getCurrentSnapshot(state: ReplayState): TickSnapshot {
  return state.snapshots[state.currentTick];
}

export function isAtStart(state: ReplayState): boolean {
  return state.currentTick === 0;
}

export function isAtEnd(state: ReplayState): boolean {
  return state.currentTick === state.snapshots.length - 1;
}

export function getRoundList(state: ReplayState): number[] {
  return [...new Set(state.snapshots.map((s) => s.round))].sort((a, b) => a - b);
}

export function getTicksForRound(state: ReplayState, round: number): number[] {
  return state.snapshots.filter((s) => s.round === round).map((s) => s.tickIndex);
}
