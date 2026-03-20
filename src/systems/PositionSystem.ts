import { Position } from '../types';
import type { BattleUnit, BattleEvent } from '../types';
import { uid } from '../utils/uid';

/**
 * 유닛 이동 (자발적)
 */
export function moveUnit(
  unit: BattleUnit,
  targetPosition: Position,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  if (unit.position === targetPosition) {
    return { unit, events: [] };
  }

  return {
    unit: { ...unit, position: targetPosition },
    events: [
      {
        id: uid(),
        type: 'UNIT_MOVED',
        round,
        turn,
        timestamp: Date.now(),
        targetId: unit.id,
        data: { from: unit.position, to: targetPosition },
      },
    ],
  };
}

/**
 * 두 유닛의 포지션 교환 (SWAP)
 */
export function swapPositions(
  unitA: BattleUnit,
  unitB: BattleUnit,
  sourceId: string,
  round: number,
  turn: number,
): { unitA: BattleUnit; unitB: BattleUnit; events: BattleEvent[] } {
  if (unitA.position === unitB.position) {
    return { unitA, unitB, events: [] };
  }

  const newA = { ...unitA, position: unitB.position };
  const newB = { ...unitB, position: unitA.position };

  return {
    unitA: newA,
    unitB: newB,
    events: [
      {
        id: uid(),
        type: 'UNIT_SWAPPED',
        round,
        turn,
        timestamp: Date.now(),
        sourceId,
        data: {
          unitAId: unitA.id,
          unitBId: unitB.id,
          unitAFrom: unitA.position,
          unitATo: newA.position,
          unitBFrom: unitB.position,
          unitBTo: newB.position,
        },
      },
    ],
  };
}

/**
 * 유닛 밀기 (강제 이동)
 */
export function pushUnit(
  unit: BattleUnit,
  targetPosition: Position,
  sourceId: string,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  if (unit.position === targetPosition) {
    return { unit, events: [] };
  }

  return {
    unit: { ...unit, position: targetPosition },
    events: [
      {
        id: uid(),
        type: 'UNIT_PUSHED',
        round,
        turn,
        timestamp: Date.now(),
        sourceId,
        targetId: unit.id,
        data: { from: unit.position, to: targetPosition },
      },
    ],
  };
}
