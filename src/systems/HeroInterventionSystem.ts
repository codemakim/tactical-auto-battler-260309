import type { BattleState, HeroAbility, BattleEvent, Action, ActionCondition, BattleUnit } from '../types';
import { uid } from '../utils/uid';
import { selectTarget } from './TargetSelector';
import { applyDamage, applyShield, calculateDamage } from './DamageSystem';
import { pushUnit } from './PositionSystem';
import { Position, Team } from '../types';
import { replaceActionSlot } from './ActionCardSystem';

/**
 * 히어로 개입이 가능한지 확인
 */
export function canIntervene(state: BattleState): boolean {
  return state.hero.interventionsRemaining > 0 && !state.isFinished;
}

/**
 * 히어로 개입 실행.
 * 히어로는 전투에 직접 참전하지 않으므로, 더미 source 기반으로 처리.
 */
export function executeIntervention(
  state: BattleState,
  ability: HeroAbility,
  targetUnitId?: string,
): { state: BattleState; events: BattleEvent[] } {
  if (!canIntervene(state)) {
    return { state, events: [] };
  }

  const allEvents: BattleEvent[] = [];
  let units = [...state.units];

  allEvents.push({
    id: uid(),
    type: 'HERO_INTERVENTION',
    round: state.round,
    turn: state.turn,
    timestamp: Date.now(),
    actionId: ability.id,
    data: { abilityName: ability.name, targetUnitId },
  });

  for (const effect of ability.effects) {
    // 타겟 유닛이 명시된 경우 해당 유닛에 직접 적용
    let target = targetUnitId
      ? units.find(u => u.id === targetUnitId && u.isAlive)
      : null;

    switch (effect.type) {
      case 'SHIELD': {
        if (!target) {
          // 아군 중 HP 가장 낮은 유닛
          const allies = units.filter(u => u.team === Team.PLAYER && u.isAlive);
          target = allies.sort((a, b) => a.stats.hp - b.stats.hp)[0];
        }
        if (target) {
          const result = applyShield(target, effect.value ?? 0, state.round, state.turn);
          units = units.map(u => u.id === target!.id ? result.unit : u);
          allEvents.push(...result.events);
        }
        break;
      }

      case 'DAMAGE': {
        if (!target) {
          const enemies = units.filter(u => u.team === Team.ENEMY && u.isAlive);
          target = enemies.sort((a, b) => a.stats.hp - b.stats.hp)[0];
        }
        if (target) {
          const dmg = Math.floor((effect.value ?? 1) * 15); // 히어로 기본 공격력 15
          const result = applyDamage(target, dmg, 'hero', state.round, state.turn);
          units = units.map(u => u.id === target!.id ? result.unit : u);
          allEvents.push(...result.events);
        }
        break;
      }

      case 'PUSH': {
        if (!target) {
          const enemies = units.filter(
            u => u.team === Team.ENEMY && u.isAlive && u.position === Position.FRONT,
          );
          target = enemies[0];
        }
        if (target) {
          const pos = effect.position ?? Position.BACK;
          const result = pushUnit(target, pos, 'hero', state.round, state.turn);
          units = units.map(u => u.id === target!.id ? result.unit : u);
          allEvents.push(...result.events);
        }
        break;
      }

      default:
        break;
    }
  }

  const updatedHero = {
    ...state.hero,
    interventionsRemaining: state.hero.interventionsRemaining - 1,
  };

  return {
    state: { ...state, units, hero: updatedHero },
    events: allEvents,
  };
}

/**
 * 영웅 공통 능력: 액션 카드 편집.
 * 유닛의 액션 슬롯 하나를 전투 중 영구 교체한다.
 * 전투 종료 후 preBattleActionSlots로 원복된다.
 * 개입 1회 소모.
 */
export function heroEditAction(
  state: BattleState,
  targetUnitId: string,
  slotIndex: number,
  newAction: Action,
  newCondition: ActionCondition,
): { state: BattleState; events: BattleEvent[] } {
  if (!canIntervene(state)) {
    return { state, events: [] };
  }

  const target = state.units.find(u => u.id === targetUnitId && u.isAlive);
  if (!target) {
    return { state, events: [] };
  }

  // 아군만 편집 가능
  if (target.team !== Team.PLAYER) {
    return { state, events: [] };
  }

  const updatedUnit = replaceActionSlot(target, slotIndex, newAction, newCondition);
  if (!updatedUnit) {
    return { state, events: [] };
  }

  const units = state.units.map(u => u.id === targetUnitId ? updatedUnit : u);

  const event: BattleEvent = {
    id: uid(),
    type: 'ACTION_EDITED',
    round: state.round,
    turn: state.turn,
    timestamp: Date.now(),
    targetId: targetUnitId,
    data: {
      slotIndex,
      newActionId: newAction.id,
      newActionName: newAction.name,
      newCondition: newCondition.type,
    },
  };

  const updatedHero = {
    ...state.hero,
    interventionsRemaining: state.hero.interventionsRemaining - 1,
  };

  return {
    state: { ...state, units, hero: updatedHero },
    events: [event],
  };
}
