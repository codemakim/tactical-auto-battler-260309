import { describe, it, expect, beforeEach } from 'vitest';
import { captureTickSnapshot } from '../systems/ReplaySnapshotCollector';
import { createBattleState } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { Team, Position, BattlePhase, CharacterClass } from '../types';
import type { BattleState, BattleEvent, BattleUnit } from '../types';
import { resetUid } from '../utils/uid';

// 테스트용 유닛 생성 헬퍼
function makeTestState(): BattleState {
  const p1 = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
  const p2 = createUnit(createCharacterDef('Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
  const e1 = createUnit(createCharacterDef('Brute', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
  const e2 = createUnit(createCharacterDef('Ranger', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);
  return createBattleState([p1, p2], [e1, e2], [], []);
}

const sampleEvents: BattleEvent[] = [
  {
    id: 'ev1',
    type: 'DAMAGE_DEALT',
    round: 1,
    turn: 1,
    timestamp: 1000,
    sourceId: 'u1',
    targetId: 'u2',
    value: 25,
  },
  {
    id: 'ev2',
    type: 'UNIT_DIED',
    round: 1,
    turn: 1,
    timestamp: 1001,
    targetId: 'u2',
  },
];

describe('captureTickSnapshot', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('올바른 tickIndex, round, turn, phase를 캡처한다', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 5, []);

    expect(snap.tickIndex).toBe(5);
    expect(snap.round).toBe(state.round);
    expect(snap.turn).toBe(state.turn);
    expect(snap.phase).toBe(state.phase);
  });

  it('유닛을 deep copy한다 — 원본 변경이 스냅샷에 영향 없음', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 0, []);

    // 원본 유닛 스탯 변경
    state.units[0].stats.hp = 0;
    state.units[0].stats.atk = 999;

    // 스냅샷은 원본 변경과 무관
    expect(snap.units[0].stats.hp).not.toBe(0);
    expect(snap.units[0].stats.atk).not.toBe(999);
  });

  it('모든 유닛을 포함한다', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 0, []);

    expect(snap.units.length).toBe(state.units.length);
    for (let i = 0; i < state.units.length; i++) {
      expect(snap.units[i].id).toBe(state.units[i].id);
      expect(snap.units[i].name).toBe(state.units[i].name);
    }
  });

  it('이벤트 배열은 전달된 새 이벤트만 포함한다', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 3, sampleEvents);

    expect(snap.events).toHaveLength(2);
    expect(snap.events[0].id).toBe('ev1');
    expect(snap.events[1].id).toBe('ev2');
  });

  it('이벤트 없는 틱은 빈 배열', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 0, []);

    expect(snap.events).toEqual([]);
  });

  it('turnOrder를 복사한다', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 0, []);

    // 원본 변경
    state.turnOrder.push('fake-id');

    expect(snap.turnOrder).not.toContain('fake-id');
    expect(snap.turnOrder.length).toBe(state.turnOrder.length - 1);
  });

  it('hero 상태를 캡처한다', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 0, []);

    expect(snap.hero.heroType).toBe(state.hero.heroType);
    expect(snap.hero.interventionsRemaining).toBe(state.hero.interventionsRemaining);
  });

  it('delayedEffects를 복사한다', () => {
    const state = makeTestState();
    const snap = captureTickSnapshot(state, 0, []);

    expect(snap.delayedEffects).toEqual(state.delayedEffects);
  });

  it('buffs를 deep copy한다', () => {
    const state = makeTestState();
    // 유닛에 버프 추가
    state.units[0].buffs = [{ id: 'b1', type: 'ATK_UP', value: 5, duration: 2, sourceId: 'hero' }];

    const snap = captureTickSnapshot(state, 0, []);

    // 원본 버프 변경
    state.units[0].buffs[0].value = 999;

    expect(snap.units[0].buffs[0].value).toBe(5);
  });
});
