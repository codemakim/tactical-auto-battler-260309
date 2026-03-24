/**
 * 턴 순서 정합성 테스트
 *
 * 핵심 규칙:
 * 1. getNextActor()는 state.turnOrder 캐시를 사용해야 한다 (매번 재계산 금지)
 * 2. 라운드 중 HP가 변해도 턴 순서가 바뀌면 안 된다
 * 3. turnOrder에서 이미 행동한 유닛을 건너뛰고 다음 유닛이 행동해야 한다
 * 4. UI가 보여주는 순서(state.turnOrder 기반)와 실제 실행 순서가 일치해야 한다
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle } from '../core/BattleEngine';
import { getNextActor, executeTurn, startRound } from '../core/RoundManager';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { Team, Position, BattlePhase } from '../types';
import type { BattleState, BattleUnit } from '../types';

// AGI를 직접 조작한 유닛 생성 헬퍼
function makeUnit(name: string, team: Team, position: Position, agi: number): BattleUnit {
  const def = createCharacterDef(name, 'WARRIOR');
  const unit = createUnit(def, team, position);
  // AGI 직접 오버라이드
  return { ...unit, stats: { ...unit.stats, agi } };
}

describe('턴 순서 정합성', () => {
  let state: BattleState;

  beforeEach(() => {
    resetUnitCounter();
    // AGI 순서: Fast(20) > Mid(10) > Slow(5) > Enemy(3)
    const fast = makeUnit('Fast', Team.PLAYER, Position.FRONT, 20);
    const mid = makeUnit('Mid', Team.PLAYER, Position.FRONT, 10);
    const slow = makeUnit('Slow', Team.PLAYER, Position.FRONT, 5);
    const enemy = makeUnit('Enemy', Team.ENEMY, Position.FRONT, 3);

    state = createBattleState([fast, mid, slow], [enemy], [], [], 42);
    // 라운드 시작까지 진행
    state = startRound(state);
  });

  it('getNextActor()는 state.turnOrder의 첫 번째 미행동 유닛을 반환해야 한다', () => {
    const turnOrder = state.turnOrder;
    const firstInOrder = turnOrder[0];
    const actor = getNextActor(state);

    expect(actor).not.toBeNull();
    expect(actor!.id).toBe(firstInOrder);
  });

  it('라운드 내내 실행 순서가 state.turnOrder와 일치해야 한다', () => {
    const originalOrder = [...state.turnOrder];
    const executionOrder: string[] = [];
    let current = state;

    // 모든 유닛 행동 완료까지
    while (true) {
      const actor = getNextActor(current);
      if (!actor) break;
      executionOrder.push(actor.id);
      current = executeTurn(current);
    }

    expect(executionOrder).toEqual(originalOrder);
  });

  it('HP가 변해도 같은 라운드 내 실행 순서가 turnOrder와 일치해야 한다', () => {
    const originalOrder = [...state.turnOrder];

    // 두 번째 유닛의 HP를 크게 깎음 (방어 우선권 조건이 바뀔 수 있는 상황)
    const modified: BattleState = {
      ...state,
      units: state.units.map((u) => (u.id === originalOrder[1] ? { ...u, stats: { ...u.stats, hp: 1 } } : u)),
    };

    // 첫 번째 유닛 확인
    const actor1 = getNextActor(modified);
    expect(actor1!.id).toBe(originalOrder[0]);

    // 첫 유닛 행동 후 두 번째도 캐시 순서 따라야 함
    const afterFirst = executeTurn(modified);
    const actor2 = getNextActor(afterFirst);
    expect(actor2!.id).toBe(originalOrder[1]);

    // 세 번째도
    const afterSecond = executeTurn(afterFirst);
    const actor3 = getNextActor(afterSecond);
    expect(actor3!.id).toBe(originalOrder[2]);
  });

  it('행동한 유닛을 건너뛰고 다음 유닛이 행동해야 한다', () => {
    const originalOrder = [...state.turnOrder];

    // 첫 유닛 행동
    const afterFirst = executeTurn(state);
    const actedUnit = afterFirst.units.find((u) => u.hasActedThisRound);
    expect(actedUnit!.id).toBe(originalOrder[0]);

    // 다음 행동 유닛은 turnOrder[1]
    const nextActor = getNextActor(afterFirst);
    expect(nextActor!.id).toBe(originalOrder[1]);
  });
});

describe('HP 변화로 tiebreak가 뒤바뀌는 시나리오', () => {
  beforeEach(() => {
    resetUnitCounter();
  });

  it('AGI가 같고 HP 비율이 tiebreaker인 경우에도 캐시된 순서를 따라야 한다', () => {
    // AGI가 동일한 두 유닛 — HP 비율로 순서가 결정됨
    const unitA = makeUnit('UnitA', Team.PLAYER, Position.FRONT, 8);
    const unitB = makeUnit('UnitB', Team.ENEMY, Position.FRONT, 8);

    let state = createBattleState([unitA], [unitB], [], [], 42);
    state = startRound(state);

    const originalOrder = [...state.turnOrder];
    const firstId = originalOrder[0];
    const secondId = originalOrder[1];

    // 첫 번째 유닛의 HP를 깎아서 tiebreak 조건 변경
    // 만약 재계산하면 순서가 뒤바뀔 수 있는 상황
    const modified: BattleState = {
      ...state,
      units: state.units.map((u) => (u.id === firstId ? { ...u, stats: { ...u.stats, hp: 1 } } : u)),
    };

    // 그래도 캐시된 순서를 따라야 함
    const actor = getNextActor(modified);
    expect(actor!.id).toBe(firstId);
  });
});

describe('doStep 시뮬레이션: 한 스텝 = 한 유닛 행동', () => {
  beforeEach(() => {
    resetUnitCounter();
  });

  it('stepBattle 한 사이클이 정확히 한 유닛만 행동시켜야 한다', () => {
    const fast = makeUnit('Fast', Team.PLAYER, Position.FRONT, 20);
    const slow = makeUnit('Slow', Team.PLAYER, Position.FRONT, 5);
    const enemy = makeUnit('Enemy', Team.ENEMY, Position.FRONT, 3);

    let state = createBattleState([fast, slow], [enemy], [], [], 42);

    // ROUND_START → startRound (TURN_START로 전환)
    let result = stepBattle(state);
    state = result.state;
    expect(state.phase).toBe(BattlePhase.TURN_START);

    const turnOrderAtStart = [...state.turnOrder];
    const actedBefore = state.units.filter((u) => u.hasActedThisRound).length;

    // TURN_START → executeTurn (TURN_END로 전환) = 한 유닛 행동
    result = stepBattle(state);
    state = result.state;

    const actedAfter = state.units.filter((u) => u.hasActedThisRound).length;
    expect(actedAfter).toBe(actedBefore + 1);

    // 행동한 유닛이 turnOrder의 첫 번째여야 함
    const actedUnit = state.units.find((u) => u.hasActedThisRound);
    expect(actedUnit!.id).toBe(turnOrderAtStart[0]);
  });
});
