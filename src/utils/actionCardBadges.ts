import koData from '../locales/ko.json';
import enData from '../locales/en.json';
import type { ActionCondition, ActionEffect, ActionTargetType, Position } from '../types';
import { getMonoEffectIcon } from './actionIcons';
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
  position: Record<string, string>;
}

const BADGE_LOCALES: Record<Locale, BadgeLocaleData> = {
  ko: {
    buffType: (koData as { buffType: Record<string, string> }).buffType,
    position: (koData as { position: Record<string, string> }).position,
  },
  en: {
    buffType: (enData as { buffType: Record<string, string> }).buffType,
    position: (enData as { position: Record<string, string> }).position,
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
    return text.replace(/^자신 /, '나 ').replace(/^내 /, '나 ');
  }
  return text.replace(/^Self /, 'Self ');
}

function normalizeTargetText(text: string, locale?: Locale): string {
  const activeLocale = locale ?? getDefaultLocale();
  if (activeLocale === 'ko') {
    return text
      .replace(/^자신$/, '나')
      .replace(/^자신 /, '나 ')
      .replace(/^내 /, '나 ');
  }
  return text;
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
    return [{ text: activeLocale === 'en' ? 'Self' : '나', tone: 'self' }];
  }

  const tone: ActionBadgeTone = target.side === 'ALLY' ? 'ally' : 'enemy';
  const formatted = normalizeTargetText(
    formatTarget(target, activeLocale)
      .replace('최저HP', '최저 HP')
      .replace('최고ATK', '최고 ATK')
      .replace('lowest HP', 'lowest HP')
      .trim(),
    activeLocale,
  );

  return [{ text: formatted, tone }];
}

function formatPercentDown(value: number | undefined, locale?: Locale): string {
  if ((locale ?? getDefaultLocale()) === 'en') return `HP ${value ?? 0}%↓`;
  return `HP ${value ?? 0}%↓`;
}

function formatEffectBadge(effect: ActionEffect, locale?: Locale): ActionBadge {
  const l = getBadgeLocale(locale);
  const position = effect.position ? (l.position[effect.position as Position] ?? effect.position) : '';
  const targetText = effect.target ? (formatTargetBadge(effect.target, locale)[0]?.text ?? '') : '';
  const targetPrefix = targetText ? `${targetText} ` : '';
  const icon = getMonoEffectIcon(effect.type);

  switch (effect.type) {
    case 'DAMAGE':
      return {
        text: `${icon} ${targetPrefix}${locale === 'en' ? 'Attack' : '공격'}x${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'HEAL':
      return {
        text: `${icon} ${targetPrefix}${locale === 'en' ? 'Heal' : '회복'}${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'SHIELD':
      return {
        text: `${icon} ${targetPrefix}${locale === 'en' ? 'Shield' : '실드'}x${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'MOVE':
      return { text: `${icon} ${targetPrefix}${position} ${locale === 'en' ? 'Move' : '이동'}`, tone: 'effect' };
    case 'PUSH':
      return { text: `${icon} ${targetPrefix}${position} ${locale === 'en' ? 'Push' : '밀침'}`, tone: 'effect' };
    case 'REPOSITION':
      return {
        text: `${icon} ${targetPrefix}${position} ${locale === 'en' ? 'Reposition' : '재배치'}`,
        tone: 'effect',
      };
    case 'BUFF':
      return {
        text: `${icon} ${targetPrefix}${l.buffType[effect.buffType ?? ''] ?? effect.buffType ?? ''} ${effect.duration ?? 0}T`,
        tone: 'effect',
      };
    case 'DEBUFF':
      return {
        text: `${icon} ${targetPrefix}${l.buffType[effect.buffType ?? ''] ?? effect.buffType ?? ''} ${effect.duration ?? 0}T`,
        tone: 'effect',
      };
    case 'DELAY_TURN':
      return {
        text: `${icon} ${targetPrefix}${locale === 'en' ? 'Delay' : '행동지연'} ${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'ADVANCE_TURN':
      return {
        text: `${icon} ${targetPrefix}${locale === 'en' ? 'Advance' : '행동가속'} ${effect.value ?? 0}`,
        tone: 'effect',
      };
    case 'DELAYED':
      return {
        text: `${icon} ${targetPrefix}${effect.delayRounds ?? 0}T ${locale === 'en' ? 'Delayed' : '지연'}`,
        tone: 'effect',
      };
    case 'SWAP':
      return {
        text: `${icon} ${targetText}${effect.swapTarget ? ` ⇄ ${formatTargetBadge(effect.swapTarget, locale)[0]?.text ?? ''}` : ''}`,
        tone: 'effect',
      };
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

  return {
    selfBadges: uniqueBadges(selfBadges),
    targetBadges: uniqueBadges([...conditionalTargetBadges]),
    effectBadges: effects.map((effect) => formatEffectBadge(effect, activeLocale)),
  };
}

export { formatPercentDown };
