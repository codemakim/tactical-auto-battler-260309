import type { BattleState, HeroAbility, BattleEvent } from '../types';
import { uid } from '../utils/uid';
import { selectTarget } from './TargetSelector';
import { applyDamage, applyShield, calculateDamage } from './DamageSystem';
import { pushUnit } from './PositionSystem';
import { Position, Team } from '../types';

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
