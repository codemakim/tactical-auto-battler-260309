/**
 * 히어로 AI — 시뮬레이션용 자동 개입 결정 로직
 * 순수 함수: BattleState → 개입 결정 (ability + targetId) 또는 null
 */

import { AbilityType, HeroType, Team } from '../types';
import type { BattleState, HeroAbility, BattleUnit } from '../types';
import { canIntervene } from './HeroInterventionSystem';

export interface HeroDecision {
  ability: HeroAbility;
  targetId: string;
}

/** 아군 중 생존 유닛 */
function aliveAllies(state: BattleState): BattleUnit[] {
  return state.units.filter((u) => u.team === Team.PLAYER && u.isAlive);
}

/** 적 중 생존 유닛 */
function aliveEnemies(state: BattleState): BattleUnit[] {
  return state.units.filter((u) => u.team === Team.ENEMY && u.isAlive);
}

/** HP 비율이 가장 낮은 유닛 */
function lowestHpRatio(units: BattleUnit[]): BattleUnit | undefined {
  return units.reduce<BattleUnit | undefined>((best, u) => {
    const ratio = u.stats.hp / u.stats.maxHp;
    if (!best) return u;
    return ratio < best.stats.hp / best.stats.maxHp ? u : best;
  }, undefined);
}

/** HP가 가장 낮은 유닛 (절대값) */
function lowestHp(units: BattleUnit[]): BattleUnit | undefined {
  return units.reduce<BattleUnit | undefined>((best, u) => {
    if (!best) return u;
    return u.stats.hp < best.stats.hp ? u : best;
  }, undefined);
}

/** ATK가 가장 높은 유닛 */
function highestAtk(units: BattleUnit[]): BattleUnit | undefined {
  return units.reduce<BattleUnit | undefined>((best, u) => {
    if (!best) return u;
    return u.stats.atk > best.stats.atk ? u : best;
  }, undefined);
}

/** EFFECT 타입 능력 중 id로 찾기 */
function findAbility(state: BattleState, abilityId: string): HeroAbility | undefined {
  return state.hero.abilities.find((a) => a.id === abilityId && a.abilityType === AbilityType.EFFECT);
}

/**
 * COMMANDER AI 전략
 * - 아군 HP 40% 이하 존재 → Shield Order (실드 부여)
 * - 그 외 → Rally (ATK_UP 버프, ATK 높은 아군 대상)
 */
function commanderDecide(state: BattleState): HeroDecision | null {
  const allies = aliveAllies(state);
  const weakAlly = lowestHpRatio(allies);
  if (!weakAlly) return null;

  const shieldOrder = findAbility(state, 'commander_shield_order');
  const rally = findAbility(state, 'commander_rally');

  // 아군 HP 40% 이하 → 실드
  if (shieldOrder && weakAlly.stats.hp / weakAlly.stats.maxHp < 0.4) {
    return { ability: shieldOrder, targetId: weakAlly.id };
  }

  // ATK 가장 높은 아군에게 Rally
  if (rally) {
    const best = highestAtk(allies);
    if (best) return { ability: rally, targetId: best.id };
  }

  return null;
}

/**
 * MAGE AI 전략
 * - 적 HP 30% 이하 존재 → Fireball (마무리 시도)
 * - 그 외 → Weaken (ATK 높은 적에게 ATK_DOWN)
 */
function mageDecide(state: BattleState): HeroDecision | null {
  const enemies = aliveEnemies(state);
  if (enemies.length === 0) return null;

  const fireball = findAbility(state, 'mage_fireball');
  const weaken = findAbility(state, 'mage_weaken');

  // 적 HP 30% 이하 → Fireball 마무리
  const weakEnemy = lowestHpRatio(enemies);
  if (fireball && weakEnemy && weakEnemy.stats.hp / weakEnemy.stats.maxHp < 0.3) {
    return { ability: fireball, targetId: weakEnemy.id };
  }

  // ATK 높은 적에게 Weaken
  if (weaken) {
    const dangerous = highestAtk(enemies);
    if (dangerous) return { ability: weaken, targetId: dangerous.id };
  }

  // Weaken 없으면 Fireball (HP 가장 낮은 적)
  if (fireball) {
    const target = lowestHp(enemies);
    if (target) return { ability: fireball, targetId: target.id };
  }

  return null;
}

/**
 * SUPPORT AI 전략
 * - 아군 HP 50% 이하 존재 → Heal
 * - 그 외 → Haste (아직 행동 안 한 아군 중 AGI 높은 유닛)
 */
function supportDecide(state: BattleState): HeroDecision | null {
  const allies = aliveAllies(state);
  if (allies.length === 0) return null;

  const heal = findAbility(state, 'support_heal');
  const haste = findAbility(state, 'support_haste');

  // 아군 HP 50% 이하 → Heal
  const weakAlly = lowestHpRatio(allies);
  if (heal && weakAlly && weakAlly.stats.hp / weakAlly.stats.maxHp < 0.5) {
    return { ability: heal, targetId: weakAlly.id };
  }

  // 아직 행동 안 한 아군 중 턴이 빠른 유닛에게 Haste
  if (haste) {
    const notActed = allies.filter((u) => !u.hasActedThisRound);
    const target = notActed.length > 0 ? notActed.sort((a, b) => b.stats.agi - a.stats.agi)[0] : allies[0];
    if (target) return { ability: haste, targetId: target.id };
  }

  return null;
}

/**
 * 히어로 AI 메인 결정 함수
 * 개입 가능 상태이고, 큐가 비어있을 때만 결정을 내린다.
 */
export function heroDecide(state: BattleState): HeroDecision | null {
  if (!canIntervene(state)) return null;
  if (state.hero.queuedAbility) return null;

  switch (state.hero.heroType) {
    case HeroType.COMMANDER:
      return commanderDecide(state);
    case HeroType.MAGE:
      return mageDecide(state);
    case HeroType.SUPPORT:
      return supportDecide(state);
    default:
      return null;
  }
}
