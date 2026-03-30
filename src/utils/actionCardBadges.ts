import koData from '../locales/ko.json';
import enData from '../locales/en.json';
import type { ActionCondition, ActionEffect, ActionTargetType, Position } from '../types';
import { formatCondition, formatTarget, getDefaultLocale, type Locale } from './actionText';

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

interface BadgeLocaleData {
  buffType: Record<string, string>;
  stat: Record<string, string>;
  position: Record<string, string>;
  effectShort: Record<string, string>;
}

const BADGE_LOCALES: Record<Locale, BadgeLocaleData> = {
  ko: {
    buffType: (koData as { buffType: Record<string, string> }).buffType,
    stat: (koData as { stat: Record<string, string> }).stat,
    position: (koData as { position: Record<string, string> }).position,
    effectShort: {
      DAMAGE: '🗡',
      HEAL: '✚',
      SHIELD: '🛡',
      MOVE: '→',
      PUSH: '⇒',
      BUFF: '▲',
      DEBUFF: '▼',
      DELAY_TURN: '⏳',
      ADVANCE_TURN: '⏩',
      REPOSITION: '↔',
      DELAYED: '⏱',
      SWAP: '⇄',
    },
  },
  en: {
    buffType: (enData as { buffType: Record<string, string> }).buffType,
    stat: (enData as { stat: Record<string, string> }).stat,
    position: (enData as { position: Record<string, string> }).position,
    effectShort: {
      DAMAGE: '🗡',
      HEAL: '✚',
      SHIELD: '🛡',
      MOVE: '→',
      PUSH: '⇒',
      BUFF: '▲',
      DEBUFF: '▼',
      DELAY_TURN: '⏳',
      ADVANCE_TURN: '⏩',
      REPOSITION: '↔',
      DELAYED: '⏱',
      SWAP: '⇄',
    },
  },
};

function getBadgeLocale(locale?: Locale): BadgeLocaleData {
  return BADGE_LOCALES[locale ?? getDefaultLocale()];
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

function normalizeConditionText(text: string, locale?: Locale): string {
  const activeLocale = locale ?? getDefaultLocale();
  if (activeLocale === 'ko') {
    return text.replace(/^자신 /, '내 ');
  }
  return text.replace(/^Self /, 'My ');
}

function formatSelfCondition(condition: ActionCondition, locale?: Locale): ActionBadge[] {
  switch (condition.type) {
    case 'POSITION_FRONT':
    case 'POSITION_BACK':
    case 'HP_BELOW':
    case 'HP_ABOVE':
    case 'FIRST_ACTION_THIS_ROUND':
    case 'HAS_HERO_BUFF':
      return [{ text: normalizeConditionText(formatCondition(condition, locale), locale), tone: 'self' }];
    default:
      return [];
  }
}

function formatTargetCondition(condition: ActionCondition, locale?: Locale): ActionBadge[] {
  switch (condition.type) {
    case 'ENEMY_FRONT_EXISTS':
      return [{ text: locale === 'en' ? 'Enemy front' : '적 전열', tone: 'enemy' }];
    case 'ENEMY_BACK_EXISTS':
      return [{ text: locale === 'en' ? 'Enemy back' : '적 후열', tone: 'enemy' }];
    case 'ALLY_HP_BELOW':
      return [
        {
          text: formatCondition(condition, locale).replace(' 이하', '').replace(' ≤', ' ').replace('%', '%↓'),
          tone: 'ally',
        },
      ];
    case 'ENEMY_HP_BELOW':
      return [
        {
          text: formatCondition(condition, locale).replace(' 이하', '').replace(' ≤', ' ').replace('%', '%↓'),
          tone: 'enemy',
        },
      ];
    case 'LOWEST_HP_ENEMY':
      return [{ text: locale === 'en' ? 'Enemy lowest HP' : '적 최저 HP', tone: 'enemy' }];
    default:
      return [];
  }
}

function formatTargetBadge(target?: ActionTargetType, locale?: Locale): ActionBadge[] {
  if (!target) return [];
  const activeLocale = locale ?? getDefaultLocale();
  if (target.side === 'SELF') {
    return [{ text: activeLocale === 'en' ? 'Self' : '자신', tone: 'self' }];
  }

  const tone: ActionBadgeTone = target.side === 'ALLY' ? 'ally' : 'enemy';
  const formatted = formatTarget(target, activeLocale)
    .replace('최저HP', '최저 HP')
    .replace('최고ATK', '최고 ATK')
    .replace('lowest HP', 'lowest HP')
    .trim();

  return [{ text: formatted, tone }];
}

function formatPercentDown(value: number | undefined, locale?: Locale): string {
  if ((locale ?? getDefaultLocale()) === 'en') return `HP ${value ?? 0}%↓`;
  return `HP ${value ?? 0}%↓`;
}

function formatEffectBadge(effect: ActionEffect, locale?: Locale): ActionBadge {
  const l = getBadgeLocale(locale);
  const short = l.effectShort[effect.type] ?? effect.type;
  const stat = effect.stat ? (l.stat[effect.stat] ?? effect.stat.toUpperCase()) : '';
  const position = effect.position ? (l.position[effect.position as Position] ?? effect.position) : '';

  switch (effect.type) {
    case 'DAMAGE':
    case 'HEAL':
    case 'SHIELD':
      return { text: stat ? `${short} ${stat}x${effect.value ?? 0}` : `${short} ${effect.value ?? 0}`, tone: 'effect' };
    case 'MOVE':
    case 'PUSH':
    case 'REPOSITION':
      return { text: `${short} ${position}`, tone: 'effect' };
    case 'BUFF':
    case 'DEBUFF':
      return {
        text: `${short} ${l.buffType[effect.buffType ?? ''] ?? effect.buffType ?? ''} ${effect.duration ?? 0}T`,
        tone: 'effect',
      };
    case 'DELAY_TURN':
    case 'ADVANCE_TURN':
      return { text: `${short} ${effect.value ?? 0}`, tone: 'effect' };
    case 'DELAYED':
      return {
        text: `${short} ${effect.delayRounds ?? 0}T ${l.effectShort[effect.delayedType ?? 'DAMAGE'] ?? effect.delayedType ?? 'DAMAGE'}`,
        tone: 'effect',
      };
    case 'SWAP':
      return { text: short, tone: 'effect' };
    default:
      return { text: effect.type, tone: 'neutral' };
  }
}

export function buildActionCardBadgeModel(
  condition: ActionCondition | undefined,
  effects: ActionEffect[],
  locale?: Locale,
): ActionCardBadgeModel {
  const activeLocale = locale ?? getDefaultLocale();
  const selfBadges = condition ? formatSelfCondition(condition, activeLocale) : [];
  const conditionalTargetBadges = condition ? formatTargetCondition(condition, activeLocale) : [];
  const effectTargetBadges = effects.flatMap((effect) => {
    const badges = formatTargetBadge(effect.target, activeLocale);
    if (effect.type === 'SWAP' && effect.swapTarget) {
      return badges.concat(formatTargetBadge(effect.swapTarget, activeLocale));
    }
    return badges;
  });

  return {
    selfBadges: uniqueBadges(selfBadges),
    targetBadges: uniqueBadges([...conditionalTargetBadges, ...effectTargetBadges]),
    effectBadges: effects.map((effect) => formatEffectBadge(effect, activeLocale)),
  };
}

export { formatPercentDown };
