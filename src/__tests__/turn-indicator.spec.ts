import { beforeEach, describe, expect, it } from 'vitest';
import { createBattleState } from '../core/BattleEngine';
import { executeTurn, startRound } from '../core/RoundManager';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { Position, Team } from '../types';
import type { BattleState, BattleUnit } from '../types';
import { getRemainingTurnOrder } from '../systems/TurnIndicator';

function makeUnit(name: string, team: Team, position: Position, agi: number): BattleUnit {
  const def = createCharacterDef(name, 'WARRIOR');
  const unit = createUnit(def, team, position);
  return { ...unit, stats: { ...unit.stats, agi } };
}

describe('TurnIndicator', () => {
  let state: BattleState;

  beforeEach(() => {
    resetUnitCounter();
    const fast = makeUnit('Fast', Team.PLAYER, Position.FRONT, 20);
    const mid = makeUnit('Mid', Team.PLAYER, Position.FRONT, 10);
    const slow = makeUnit('Slow', Team.ENEMY, Position.FRONT, 5);

    state = startRound(createBattleState([fast, mid], [slow], 42));
  });

  it('행동 직후 즉시 다음 유닛을 NOW로 계산해야 한다', () => {
    const before = getRemainingTurnOrder(state);
    const after = getRemainingTurnOrder(executeTurn(state));

    expect(before).toEqual(state.turnOrder);
    expect(after).toEqual(state.turnOrder.slice(1));
    expect(after[0]).toBe(state.turnOrder[1]);
  });

  it('죽은 유닛과 이미 행동한 유닛은 표시 순서에서 제외해야 한다', () => {
    const [firstId, secondId, thirdId] = state.turnOrder;
    const filteredState: BattleState = {
      ...state,
      units: state.units.map((unit) => {
        if (unit.id === firstId) {
          return { ...unit, hasActedThisRound: true };
        }
        if (unit.id === secondId) {
          return { ...unit, isAlive: false };
        }
        return unit;
      }),
    };

    expect(getRemainingTurnOrder(filteredState)).toEqual([thirdId]);
  });
});
