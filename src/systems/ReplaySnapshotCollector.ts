import type { BattleState, BattleEvent, TickSnapshot } from '../types';

/**
 * 전투 상태에서 틱 스냅샷을 캡처한다 (deep copy).
 * BattleScene의 doStep() 후 매번 호출.
 */
export function captureTickSnapshot(state: BattleState, tickIndex: number, newEvents: BattleEvent[]): TickSnapshot {
  return {
    tickIndex,
    round: state.round,
    turn: state.turn,
    phase: state.phase,
    units: state.units.map((u) => ({
      ...u,
      stats: { ...u.stats },
      buffs: u.buffs.map((b) => ({ ...b })),
      actionSlots: u.actionSlots.map((s) => ({ ...s })),
      baseActionSlots: u.baseActionSlots.map((s) => ({ ...s })),
    })),
    turnOrder: [...state.turnOrder],
    events: [...newEvents],
    hero: {
      ...state.hero,
      abilities: state.hero.abilities.map((a) => ({ ...a })),
    },
    delayedEffects: state.delayedEffects.map((d) => ({ ...d })),
  };
}
