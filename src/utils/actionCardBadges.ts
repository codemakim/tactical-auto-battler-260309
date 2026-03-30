import type { ActionCondition, ActionEffect, ActionTargetType, Position } from '../types';

export type ActionBadgeTone = 'self' | 'ally' | 'enemy' | 'effect' | 'neutral';

export interface ActionBadge {
  text: string;
  tone: ActionBadgeTone;
}

export interface ActionCardBadgeModel {
  selfBadges: ActionBadge[];
  targetBadges: ActionBadge[];
  effectBadges: ActionBadge[];
}

function uniqueBadges(badges: ActionBadge[]): ActionBadge[] {
  const seen = new Set<string>();
  return badges.filter((badge) => {
    const key = `${badge.tone}:${badge.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatPosition(position?: Position): string {
  if (position === 'BACK') return '후열';
  return '전열';
}

function formatSelfCondition(condition: ActionCondition): ActionBadge[] {
  switch (condition.type) {
    case 'POSITION_FRONT':
      return [{ text: '내 전열', tone: 'self' }];
    case 'POSITION_BACK':
      return [{ text: '내 후열', tone: 'self' }];
    case 'HP_BELOW':
      return [{ text: `내 HP ${condition.value ?? 0}%↓`, tone: 'self' }];
    case 'HP_ABOVE':
      return [{ text: `내 HP ${condition.value ?? 0}%↑`, tone: 'self' }];
    case 'FIRST_ACTION_THIS_ROUND':
      return [{ text: '이번 라운드 첫 행동', tone: 'self' }];
    case 'HAS_HERO_BUFF':
      return [{ text: '영웅 버프 보유', tone: 'self' }];
    default:
      return [];
  }
}

function formatTargetCondition(condition: ActionCondition): ActionBadge[] {
  switch (condition.type) {
    case 'ENEMY_FRONT_EXISTS':
      return [{ text: '적 전열 존재', tone: 'enemy' }];
    case 'ENEMY_BACK_EXISTS':
      return [{ text: '적 후열 존재', tone: 'enemy' }];
    case 'ALLY_HP_BELOW':
      return [{ text: `아군 HP ${condition.value ?? 0}%↓`, tone: 'ally' }];
    case 'ENEMY_HP_BELOW':
      return [{ text: `적 HP ${condition.value ?? 0}%↓`, tone: 'enemy' }];
    case 'LOWEST_HP_ENEMY':
      return [{ text: '적 최저 HP', tone: 'enemy' }];
    default:
      return [];
  }
}

function formatTargetBadge(target?: ActionTargetType): ActionBadge[] {
  if (!target) return [];
  if (target.side === 'SELF') {
    return [{ text: '자신', tone: 'self' }];
  }

  const tone: ActionBadgeTone = target.side === 'ALLY' ? 'ally' : 'enemy';
  const side = target.side === 'ALLY' ? '아군' : '적';
  const position =
    target.position === 'FRONT'
      ? '전열 우선'
      : target.position === 'BACK'
        ? '후열 우선'
        : target.side === 'ALLY'
          ? '전체'
          : '전체';

  if (target.select === 'LOWEST_HP') {
    if (target.position === 'ANY') return [{ text: `${side} 최저 HP`, tone }];
    return [{ text: `${side} ${position} 최저 HP`, tone }];
  }
  if (target.select === 'HIGHEST_ATK') {
    if (target.position === 'ANY') return [{ text: `${side} 최고 ATK`, tone }];
    return [{ text: `${side} ${position} 최고 ATK`, tone }];
  }
  if (target.select === 'FASTEST_TURN') {
    return [{ text: `${side} 가장 빠른 턴`, tone }];
  }
  if (target.select === 'RANDOM') {
    return [{ text: `${side} 무작위`, tone }];
  }
  if (target.select === 'FIRST' && target.position === 'ANY') {
    return [{ text: side, tone }];
  }

  return [{ text: `${side} ${position}`, tone }];
}

function formatEffectBadge(effect: ActionEffect): ActionBadge {
  switch (effect.type) {
    case 'DAMAGE':
      return {
        text: effect.stat
          ? `공격 ${String(effect.stat).toUpperCase()}x${effect.value ?? 0}`
          : `공격 ${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'HEAL':
      return {
        text: effect.stat
          ? `회복 ${String(effect.stat).toUpperCase()}x${effect.value ?? 0}`
          : `회복 ${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'SHIELD':
      return {
        text: effect.stat
          ? `실드 ${String(effect.stat).toUpperCase()}x${effect.value ?? 0}`
          : `실드 ${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'MOVE':
      return { text: `이동 ${formatPosition(effect.position)}`, tone: 'effect' };
    case 'PUSH':
      return { text: `밀침 ${formatPosition(effect.position ?? 'BACK')}`, tone: 'effect' };
    case 'BUFF':
      return { text: `버프 ${effect.buffType ?? ''} ${effect.duration ?? 0}T`, tone: 'effect' };
    case 'DEBUFF':
      return { text: `약화 ${effect.buffType ?? ''} ${effect.duration ?? 0}T`, tone: 'effect' };
    case 'DELAY_TURN':
      return { text: `턴 지연 ${effect.value ?? 0}`, tone: 'effect' };
    case 'ADVANCE_TURN':
      return { text: `턴 가속 ${effect.value ?? 0}`, tone: 'effect' };
    case 'REPOSITION':
      return { text: `재배치 ${formatPosition(effect.position)}`, tone: 'effect' };
    case 'DELAYED':
      return { text: `${effect.delayRounds ?? 0}T 후 ${effect.delayedType ?? 'DAMAGE'}`, tone: 'effect' };
    case 'SWAP':
      return { text: '위치 교체', tone: 'effect' };
    default:
      return { text: effect.type, tone: 'neutral' };
  }
}

export function buildActionCardBadgeModel(
  condition: ActionCondition | undefined,
  effects: ActionEffect[],
): ActionCardBadgeModel {
  const selfBadges = condition ? formatSelfCondition(condition) : [];
  const conditionalTargetBadges = condition ? formatTargetCondition(condition) : [];
  const effectTargetBadges = effects.flatMap((effect) => {
    const badges = formatTargetBadge(effect.target);
    if (effect.type === 'SWAP' && effect.swapTarget) {
      return badges.concat(formatTargetBadge(effect.swapTarget));
    }
    return badges;
  });

  return {
    selfBadges: uniqueBadges(selfBadges),
    targetBadges: uniqueBadges([...conditionalTargetBadges, ...effectTargetBadges]),
    effectBadges: effects.map((effect) => formatEffectBadge(effect)),
  };
}
