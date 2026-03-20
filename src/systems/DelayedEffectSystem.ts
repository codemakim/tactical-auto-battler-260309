import type { BattleState, BattleEvent, DelayedEffect } from '../types';
import { uid } from '../utils/uid';
import { applyDamage, applyHeal } from './DamageSystem';
import { applyBuff } from './BuffSystem';

/**
 * 지연 효과 카운트다운: remainingRounds를 1 감소, 0이 된 것을 resolved로 분리
 */
export function tickDelayedEffects(effects: DelayedEffect[]): {
  remaining: DelayedEffect[];
  resolved: DelayedEffect[];
} {
  const remaining: DelayedEffect[] = [];
  const resolved: DelayedEffect[] = [];

  for (const effect of effects) {
    const ticked = { ...effect, remainingRounds: effect.remainingRounds - 1 };
    if (ticked.remainingRounds <= 0) {
      resolved.push(ticked);
    } else {
      remaining.push(ticked);
    }
  }

  return { remaining, resolved };
}

/**
 * 지연 효과 해석: remainingRounds가 1인 효과를 발동 처리
 * BattleState의 delayedEffects를 카운트다운하고, 발동할 것을 실행
 */
export function resolveDelayedEffects(state: BattleState): { state: BattleState; events: BattleEvent[] } {
  const { remaining, resolved } = tickDelayedEffects(state.delayedEffects);
  const allEvents: BattleEvent[] = [];
  let units = [...state.units];

  for (const effect of resolved) {
    const targetIdx = units.findIndex((u) => u.id === effect.targetId);
    const target = targetIdx >= 0 ? units[targetIdx] : undefined;

    // 대상이 없거나 이미 죽었으면 skip
    if (!target || !target.isAlive) {
      allEvents.push({
        id: uid(),
        type: 'DELAYED_EFFECT_RESOLVED',
        round: state.round,
        turn: state.turn,
        timestamp: Date.now(),
        sourceId: effect.sourceId,
        targetId: effect.targetId,
        data: {
          delayedEffectId: effect.id,
          effectType: effect.effectType,
          value: effect.value,
          skipped: true,
          reason: 'target_dead',
        },
      });
      continue;
    }

    // RESOLVED 이벤트
    allEvents.push({
      id: uid(),
      type: 'DELAYED_EFFECT_RESOLVED',
      round: state.round,
      turn: state.turn,
      timestamp: Date.now(),
      sourceId: effect.sourceId,
      targetId: effect.targetId,
      data: {
        delayedEffectId: effect.id,
        effectType: effect.effectType,
        value: effect.value,
      },
    });

    // 효과 적용
    if (effect.effectType === 'DAMAGE') {
      const result = applyDamage(target, effect.value, effect.sourceId, state.round, state.turn);
      units = units.map((u) => (u.id === target.id ? result.unit : u));
      allEvents.push(...result.events);
    } else if (effect.effectType === 'HEAL') {
      const result = applyHeal(target, effect.value, state.round, state.turn);
      units = units.map((u) => (u.id === target.id ? result.unit : u));
      allEvents.push(...result.events);
    } else if (effect.effectType === 'BUFF' && effect.buffType && effect.buffDuration !== undefined) {
      const buff = {
        id: uid(),
        type: effect.buffType,
        value: effect.value,
        duration: effect.buffDuration,
        sourceId: effect.sourceId,
      };
      const result = applyBuff(target, buff, state.round, state.turn);
      units = units.map((u) => (u.id === target.id ? result.unit : u));
      allEvents.push(...result.events);
    }
  }

  return {
    state: {
      ...state,
      units,
      delayedEffects: remaining,
    },
    events: allEvents,
  };
}
