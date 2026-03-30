import type { BattleState } from '../types';

export function getRemainingTurnOrder(state: BattleState): string[] {
  return state.turnOrder.filter((id) => {
    const unit = state.units.find((candidate) => candidate.id === id);
    return !!unit && unit.isAlive && !unit.hasActedThisRound;
  });
}
