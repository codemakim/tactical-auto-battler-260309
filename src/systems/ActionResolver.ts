import { Position, Team, Target } from '../types';
import type { BattleUnit, BattleState, ActionSlot, ActionEffect, BattleEvent, DelayedEffect } from '../types';
import { uid } from '../utils/uid';
import { selectTarget } from './TargetSelector';
import { calculateDamage, calculateShield, applyDamage, applyDamageWithCover, applyShield, applyHeal } from './DamageSystem';
import { moveUnit, pushUnit } from './PositionSystem';
import { accelerateUnit, delayUnit } from '../core/TurnOrderManager';
import { applyBuff, isStunned } from './BuffSystem';

/**
 * 조건 평가: 유닛의 현재 상태와 전체 전투 상태를 보고 조건 충족 여부 판단
 */
export function evaluateCondition(
  slot: ActionSlot,
  unit: BattleUnit,
  state: BattleState,
): boolean {
  const { type, value } = slot.condition;
  const enemyTeam = unit.team === Team.PLAYER ? Team.ENEMY : Team.PLAYER;
  const aliveUnits = state.units.filter(u => u.isAlive);

  switch (type) {
    case 'ALWAYS':
      return true;

    case 'POSITION_FRONT':
      return unit.position === Position.FRONT;

    case 'POSITION_BACK':
      return unit.position === Position.BACK;

    case 'HP_BELOW':
      return value !== undefined && (unit.stats.hp / unit.stats.maxHp) * 100 < value;

    case 'HP_ABOVE':
      return value !== undefined && (unit.stats.hp / unit.stats.maxHp) * 100 > value;

    case 'ENEMY_FRONT_EXISTS':
      return aliveUnits.some(u => u.team === enemyTeam && u.position === Position.FRONT);

    case 'ENEMY_BACK_EXISTS':
      return aliveUnits.some(u => u.team === enemyTeam && u.position === Position.BACK);

    case 'ALLY_HP_BELOW':
      return aliveUnits.some(
        u => u.team === unit.team && u.id !== unit.id &&
          value !== undefined && (u.stats.hp / u.stats.maxHp) * 100 < value,
      );

    case 'LOWEST_HP_ENEMY':
      return true; // 타겟팅 힌트 - 항상 true

    case 'FIRST_ACTION_THIS_ROUND':
      return state.turn === 1;

    case 'HAS_HERO_BUFF':
      return unit.shield > 0;

    case 'ENEMY_HP_BELOW':
      return value !== undefined && aliveUnits.some(
        u => u.team === enemyTeam && (u.stats.hp / u.stats.maxHp) * 100 < value,
      );

    default:
      return false;
  }
}

/**
 * 액션 슬롯을 우선순위대로 평가하여 실행할 액션을 선택.
 * 스펙: 첫 번째로 조건이 맞는 액션을 실행하고 평가 종료.
 * 조건이 맞는 액션이 없으면 null 반환 (턴 손실).
 * 스턴 상태면 'STUNNED' 반환.
 */
export function selectAction(
  unit: BattleUnit,
  state: BattleState,
): ActionSlot | null | 'STUNNED' {
  if (isStunned(unit)) return 'STUNNED';

  for (const slot of unit.actionSlots) {
    if (evaluateCondition(slot, unit, state)) {
      return slot;
    }
  }
  return null;
}

/**
 * 선택된 액션의 효과들을 순서대로 적용.
 * BattleState를 변경하지 않고 새로운 units 배열과 events를 반환.
 */
export function executeAction(
  source: BattleUnit,
  slot: ActionSlot,
  state: BattleState,
): { units: BattleUnit[]; events: BattleEvent[]; turnOrder?: string[]; delayedEffects?: DelayedEffect[] } {
  let units = [...state.units];
  let turnOrder: string[] | undefined;
  const allEvents: BattleEvent[] = [];
  const newDelayedEffects: DelayedEffect[] = [];

  allEvents.push({
    id: uid(),
    type: 'ACTION_EXECUTED',
    round: state.round,
    turn: state.turn,
    timestamp: Date.now(),
    sourceId: source.id,
    actionId: slot.action.id,
    data: { actionName: slot.action.name },
  });

  for (const effect of slot.action.effects) {
    if (effect.type === 'DELAY_TURN' || effect.type === 'ADVANCE_TURN') {
      // 턴 순서 변경 효과는 별도 처리
      const targetType = effect.target ?? Target.ENEMY_FRONT;
      const target = selectTarget(source, targetType, units, state);
      if (target) {
        const currentOrder = turnOrder ?? [...state.turnOrder];
        if (effect.type === 'DELAY_TURN') {
          turnOrder = delayUnit(currentOrder, target.id);
        } else {
          turnOrder = accelerateUnit(currentOrder, target.id);
        }
      }
    } else if (effect.type === 'DELAYED') {
      // §7.2: 지연 효과 생성
      const targetType = effect.target ?? Target.ENEMY_FRONT;
      const target = selectTarget(source, targetType, units, state);
      if (target) {
        const delayedEffect: DelayedEffect = {
          id: uid(),
          sourceId: source.id,
          targetId: target.id,
          effectType: effect.delayedType ?? 'DAMAGE',
          value: effect.value ?? 0,
          remainingRounds: effect.delayRounds ?? 1,
          ...(effect.buffType && { buffType: effect.buffType }),
          ...(effect.duration && { buffDuration: effect.duration }),
        };
        newDelayedEffects.push(delayedEffect);
        allEvents.push({
          id: uid(),
          type: 'DELAYED_EFFECT_APPLIED',
          round: state.round,
          turn: state.turn,
          timestamp: Date.now(),
          sourceId: source.id,
          targetId: target.id,
          data: {
            delayedEffectId: delayedEffect.id,
            effectType: delayedEffect.effectType,
            value: delayedEffect.value,
            delayRounds: delayedEffect.remainingRounds,
          },
        });
      }
    } else {
      const result = applyEffect(source, effect, units, state.round, state.turn, state);
      units = result.units;
      allEvents.push(...result.events);
      // source가 변경됐을 수 있으므로 갱신 (SELF 효과)
      const updatedSource = units.find(u => u.id === source.id);
      if (updatedSource) {
        source = updatedSource;
      }
    }
  }

  return {
    units,
    events: allEvents,
    ...(turnOrder !== undefined && { turnOrder }),
    ...(newDelayedEffects.length > 0 && { delayedEffects: newDelayedEffects }),
  };
}

/**
 * 개별 효과 적용
 */
function applyEffect(
  source: BattleUnit,
  effect: ActionEffect,
  units: BattleUnit[],
  round: number,
  turn: number,
  state?: BattleState,
): { units: BattleUnit[]; events: BattleEvent[] } {
  const allEvents: BattleEvent[] = [];
  let updatedUnits = [...units];

  const targetType = effect.target ?? Target.ENEMY_FRONT;
  const target = selectTarget(source, targetType, updatedUnits, state);

  if (!target && targetType.side !== 'SELF') {
    return { units: updatedUnits, events: allEvents };
  }

  const actualTarget = targetType.side === 'SELF' ? source : target!;

  switch (effect.type) {
    case 'DAMAGE': {
      const multiplier = effect.value ?? 1.0;
      const dmg = calculateDamage(source, actualTarget, multiplier);
      // §25 커버 판정: 후열 타겟 공격 시 COVER 유닛이 대신 피격
      const result = applyDamageWithCover(actualTarget, dmg, source.id, updatedUnits, round, turn);
      updatedUnits = result.units;
      allEvents.push(...result.events);
      break;
    }

    case 'SHIELD': {
      // stat: 'grd'가 있으면 GRD 기반 배율 계산, 없으면 고정값
      const amount = effect.stat === 'grd'
        ? calculateShield(source, effect.value ?? 1.0)
        : (effect.value ?? 0);
      const result = applyShield(actualTarget, amount, round, turn);
      updatedUnits = updatedUnits.map(u => u.id === actualTarget.id ? result.unit : u);
      allEvents.push(...result.events);
      break;
    }

    case 'HEAL': {
      const amount = effect.value ?? 0;
      const result = applyHeal(actualTarget, amount, round, turn);
      updatedUnits = updatedUnits.map(u => u.id === actualTarget.id ? result.unit : u);
      allEvents.push(...result.events);
      break;
    }

    case 'MOVE': {
      const pos = effect.position ?? Position.FRONT;
      const result = moveUnit(actualTarget, pos, round, turn);
      updatedUnits = updatedUnits.map(u => u.id === actualTarget.id ? result.unit : u);
      allEvents.push(...result.events);
      break;
    }

    case 'PUSH': {
      const pos = effect.position ?? Position.BACK;
      const result = pushUnit(actualTarget, pos, source.id, round, turn);
      updatedUnits = updatedUnits.map(u => u.id === actualTarget.id ? result.unit : u);
      allEvents.push(...result.events);
      break;
    }

    case 'BUFF':
    case 'DEBUFF': {
      const buffType = effect.buffType;
      if (!buffType) break;
      const buff = {
        id: uid(),
        type: buffType,
        value: effect.value ?? 0,
        duration: effect.duration ?? 1,
        sourceId: source.id,
      };
      const result = applyBuff(actualTarget, buff, round, turn);
      updatedUnits = updatedUnits.map(u => u.id === actualTarget.id ? result.unit : u);
      allEvents.push(...result.events);
      break;
    }

    case 'REPOSITION': {
      const pos = effect.position ?? Position.FRONT;
      const result = moveUnit(actualTarget, pos, round, turn);
      updatedUnits = updatedUnits.map(u => u.id === actualTarget.id ? result.unit : u);
      allEvents.push(...result.events);
      break;
    }

    default:
      break;
  }

  return { units: updatedUnits, events: allEvents };
}
