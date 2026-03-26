import { describe, it, expect } from 'vitest';
import {
  createReplayState,
  nextTick,
  prevTick,
  jumpToTick,
  jumpToRound,
  togglePlay,
  setSpeed,
  getCurrentSnapshot,
  isAtStart,
  isAtEnd,
  getRoundList,
  getTicksForRound,
} from '../systems/ReplayController';
import type { TickSnapshot } from '../types';
import { BattlePhase } from '../types';

// 테스트용 스냅샷 헬퍼
function makeSnapshots(count: number, roundPattern?: number[]): TickSnapshot[] {
  return Array.from({ length: count }, (_, i) => ({
    tickIndex: i,
    round: roundPattern ? roundPattern[i] : Math.floor(i / 3) + 1,
    turn: (i % 3) + 1,
    phase: BattlePhase.TURN_END,
    units: [],
    turnOrder: [],
    events: [{ id: `ev-${i}`, type: 'ACTION_EXECUTED' as const, round: 1, turn: 1, timestamp: i * 1000 }],
    hero: { heroType: 'COMMANDER' as const, interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
    delayedEffects: [],
  }));
}

describe('createReplayState', () => {
  it('틱 0에서 시작하고, playing은 false', () => {
    const state = createReplayState(makeSnapshots(5));
    expect(state.currentTick).toBe(0);
    expect(state.playing).toBe(false);
    expect(state.playbackSpeed).toBe(1);
  });

  it('스냅샷 배열을 보존한다', () => {
    const snaps = makeSnapshots(3);
    const state = createReplayState(snaps);
    expect(state.snapshots).toBe(snaps);
  });
});

describe('nextTick', () => {
  it('currentTick을 1 증가시킨다', () => {
    const state = createReplayState(makeSnapshots(5));
    const next = nextTick(state);
    expect(next.currentTick).toBe(1);
  });

  it('마지막 틱에서 더 이상 증가하지 않는다', () => {
    let state = createReplayState(makeSnapshots(3));
    state = { ...state, currentTick: 2 };
    const next = nextTick(state);
    expect(next.currentTick).toBe(2);
  });

  it('마지막 틱 도달 시 playing을 false로 전환한다', () => {
    let state = createReplayState(makeSnapshots(3));
    state = { ...state, currentTick: 1, playing: true };
    const next = nextTick(state);
    expect(next.currentTick).toBe(2);
    expect(next.playing).toBe(false); // 끝에 도달하면 자동 정지
  });
});

describe('prevTick', () => {
  it('currentTick을 1 감소시킨다', () => {
    let state = createReplayState(makeSnapshots(5));
    state = { ...state, currentTick: 3 };
    const prev = prevTick(state);
    expect(prev.currentTick).toBe(2);
  });

  it('0에서 더 이상 감소하지 않는다', () => {
    const state = createReplayState(makeSnapshots(5));
    const prev = prevTick(state);
    expect(prev.currentTick).toBe(0);
  });
});

describe('jumpToTick', () => {
  it('지정 틱으로 이동한다', () => {
    const state = createReplayState(makeSnapshots(10));
    const jumped = jumpToTick(state, 7);
    expect(jumped.currentTick).toBe(7);
  });

  it('범위 초과 시 마지막 틱으로 클램핑', () => {
    const state = createReplayState(makeSnapshots(5));
    const jumped = jumpToTick(state, 100);
    expect(jumped.currentTick).toBe(4);
  });

  it('음수 시 0으로 클램핑', () => {
    const state = createReplayState(makeSnapshots(5));
    const jumped = jumpToTick(state, -5);
    expect(jumped.currentTick).toBe(0);
  });
});

describe('jumpToRound', () => {
  it('해당 라운드 첫 번째 틱으로 이동한다', () => {
    // 라운드 패턴: [1,1,1, 2,2,2, 3,3,3]
    const state = createReplayState(makeSnapshots(9));
    const jumped = jumpToRound(state, 2);
    expect(jumped.currentTick).toBe(3); // 라운드 2 첫 틱
  });

  it('존재하지 않는 라운드 — 가장 가까운 라운드로', () => {
    const snaps = makeSnapshots(6, [1, 1, 1, 3, 3, 3]); // 라운드 2 없음
    const state = createReplayState(snaps);
    const jumped = jumpToRound(state, 2);
    // 라운드 1과 3이 동일 거리 → 먼저 발견된 라운드 1 첫 틱(index 0)
    expect(jumped.currentTick).toBe(0);
  });

  it('범위 초과 라운드 — 마지막 라운드 첫 틱으로', () => {
    const state = createReplayState(makeSnapshots(9)); // 라운드 1,2,3
    const jumped = jumpToRound(state, 99);
    expect(jumped.currentTick).toBe(6); // 라운드 3 첫 틱
  });
});

describe('togglePlay', () => {
  it('playing을 토글한다', () => {
    const state = createReplayState(makeSnapshots(5));
    expect(state.playing).toBe(false);
    const toggled = togglePlay(state);
    expect(toggled.playing).toBe(true);
    const toggled2 = togglePlay(toggled);
    expect(toggled2.playing).toBe(false);
  });

  it('마지막 틱에서 재생 시작하면 처음으로 돌아간다', () => {
    let state = createReplayState(makeSnapshots(5));
    state = { ...state, currentTick: 4 }; // 마지막 틱
    const toggled = togglePlay(state);
    expect(toggled.playing).toBe(true);
    expect(toggled.currentTick).toBe(0); // 처음으로
  });
});

describe('setSpeed', () => {
  it('재생 속도를 변경한다', () => {
    const state = createReplayState(makeSnapshots(5));
    const fast = setSpeed(state, 2);
    expect(fast.playbackSpeed).toBe(2);
  });
});

describe('getCurrentSnapshot', () => {
  it('현재 틱의 스냅샷을 반환한다', () => {
    let state = createReplayState(makeSnapshots(5));
    state = { ...state, currentTick: 3 };
    const snap = getCurrentSnapshot(state);
    expect(snap.tickIndex).toBe(3);
  });
});

describe('isAtStart / isAtEnd', () => {
  it('isAtStart: 틱 0이면 true', () => {
    const state = createReplayState(makeSnapshots(5));
    expect(isAtStart(state)).toBe(true);
  });

  it('isAtStart: 틱 > 0이면 false', () => {
    let state = createReplayState(makeSnapshots(5));
    state = { ...state, currentTick: 1 };
    expect(isAtStart(state)).toBe(false);
  });

  it('isAtEnd: 마지막 틱이면 true', () => {
    let state = createReplayState(makeSnapshots(5));
    state = { ...state, currentTick: 4 };
    expect(isAtEnd(state)).toBe(true);
  });

  it('isAtEnd: 마지막이 아니면 false', () => {
    const state = createReplayState(makeSnapshots(5));
    expect(isAtEnd(state)).toBe(false);
  });
});

describe('getRoundList', () => {
  it('고유 라운드 번호를 정렬하여 반환한다', () => {
    const state = createReplayState(makeSnapshots(9)); // 라운드 1,1,1,2,2,2,3,3,3
    expect(getRoundList(state)).toEqual([1, 2, 3]);
  });
});

describe('getTicksForRound', () => {
  it('해당 라운드의 틱 인덱스를 반환한다', () => {
    const state = createReplayState(makeSnapshots(9)); // 라운드 1,1,1,2,2,2,3,3,3
    expect(getTicksForRound(state, 2)).toEqual([3, 4, 5]);
  });

  it('존재하지 않는 라운드는 빈 배열', () => {
    const state = createReplayState(makeSnapshots(9));
    expect(getTicksForRound(state, 99)).toEqual([]);
  });
});
