import koData from '../locales/ko.json';
import enData from '../locales/en.json';
import type { ActionCondition, ActionEffect, ActionSlot, ActionTargetType, Position } from '../types';

// === Types ===

export type Locale = 'ko' | 'en';

interface LocaleData {
  condition: Record<string, string>;
  effectType: Record<string, string>;
  target: {
    side: Record<string, string>;
    position: Record<string, string>;
    select: Record<string, string>;
  };
  buffType: Record<string, string>;
  stat: Record<string, string>;
  position: Record<string, string>;
  slotFormat: string;
  defensiveTag: string;
  effectSeparator: string;
  noEffects: string;
}

// === Locale Registry ===

const LOCALES: Record<Locale, LocaleData> = {
  ko: koData as LocaleData,
  en: enData as LocaleData,
};

let defaultLocale: Locale = 'ko';

export function setDefaultLocale(locale: Locale): void {
  defaultLocale = locale;
}

export function getDefaultLocale(): Locale {
  return defaultLocale;
}

function getLocale(locale?: Locale): LocaleData {
  return LOCALES[locale ?? defaultLocale];
}

// === Template Helper ===

function template(str: string, vars: Record<string, string | number>): string {
  let result = str;
  for (const [key, val] of Object.entries(vars)) {
    result = result.replace(`{${key}}`, String(val));
  }
  return result;
}

// === Public API ===

export function formatCondition(condition: ActionCondition, locale?: Locale): string {
  const l = getLocale(locale);
  const tpl = l.condition[condition.type];
  if (!tpl) return condition.type;
  if (condition.value !== undefined) {
    return template(tpl, { value: condition.value });
  }
  return tpl;
}

export function formatTarget(target: ActionTargetType, locale?: Locale): string {
  const l = getLocale(locale);

  if (target.side === 'SELF') {
    return l.target.side.SELF;
  }

  const side = l.target.side[target.side] ?? target.side;
  const pos = l.target.position[target.position] ?? '';
  const sel = l.target.select[target.select] ?? '';

  // 조합: "적 전열", "적 후열 최저HP", "아군 최저HP" 등
  const parts = [side, pos, sel].filter((s) => s.length > 0);
  return parts.join(' ');
}

export function formatEffect(effect: ActionEffect, locale?: Locale): string {
  const l = getLocale(locale);
  const targetText = effect.target ? formatTarget(effect.target, locale) : '';

  switch (effect.type) {
    case 'DAMAGE': {
      if (effect.stat) {
        return template(l.effectType.DAMAGE, {
          target: targetText,
          stat: l.stat[effect.stat] ?? effect.stat,
          value: effect.value ?? 0,
        });
      }
      return template(l.effectType.DAMAGE_FLAT, {
        target: targetText,
        value: effect.value ?? 0,
      });
    }

    case 'HEAL': {
      if (effect.stat) {
        return template(l.effectType.HEAL, {
          target: targetText,
          stat: l.stat[effect.stat] ?? effect.stat,
          value: effect.value ?? 0,
        });
      }
      return template(l.effectType.HEAL_FLAT, {
        target: targetText,
        value: effect.value ?? 0,
      });
    }

    case 'SHIELD': {
      if (effect.stat) {
        return template(l.effectType.SHIELD, {
          target: targetText,
          stat: l.stat[effect.stat] ?? effect.stat,
          value: effect.value ?? 0,
        });
      }
      return template(l.effectType.SHIELD_FLAT, {
        target: targetText,
        value: effect.value ?? 0,
      });
    }

    case 'MOVE': {
      return template(l.effectType.MOVE, {
        position: l.position[(effect.position as Position) ?? 'FRONT'] ?? effect.position ?? '',
      });
    }

    case 'PUSH': {
      return template(l.effectType.PUSH, {
        target: targetText,
        position: l.position[(effect.position as Position) ?? 'BACK'] ?? effect.position ?? '',
      });
    }

    case 'BUFF': {
      return template(l.effectType.BUFF, {
        target: targetText,
        buffType: l.buffType[effect.buffType ?? ''] ?? effect.buffType ?? '',
        duration: effect.duration ?? 0,
      });
    }

    case 'DEBUFF': {
      return template(l.effectType.DEBUFF, {
        target: targetText,
        buffType: l.buffType[effect.buffType ?? ''] ?? effect.buffType ?? '',
        duration: effect.duration ?? 0,
      });
    }

    case 'DELAY_TURN': {
      return template(l.effectType.DELAY_TURN, {
        target: targetText,
        value: effect.value ?? 0,
      });
    }

    case 'ADVANCE_TURN': {
      return template(l.effectType.ADVANCE_TURN, {
        target: targetText,
        value: effect.value ?? 0,
      });
    }

    case 'REPOSITION': {
      return template(l.effectType.REPOSITION, {
        target: targetText,
        position: l.position[(effect.position as Position) ?? 'FRONT'] ?? effect.position ?? '',
      });
    }

    case 'DELAYED': {
      const delayedType = effect.delayedType ?? 'DAMAGE';
      // 지연 효과의 내부 효과 텍스트 생성
      const innerEffect = formatEffect(
        {
          type: delayedType as ActionEffect['type'],
          value: effect.value,
          stat: effect.stat,
          target: effect.target,
          buffType: effect.buffType,
          duration: effect.duration,
        },
        locale,
      );
      return template(l.effectType.DELAYED, {
        delayRounds: effect.delayRounds ?? 0,
        delayedEffect: innerEffect,
      });
    }

    case 'SWAP': {
      const swapTargetText = effect.swapTarget ? formatTarget(effect.swapTarget, locale) : '';
      return template(l.effectType.SWAP, {
        target: targetText,
        swapTarget: swapTargetText,
      });
    }

    default:
      return effect.type;
  }
}

export function formatEffects(effects: ActionEffect[], locale?: Locale): string {
  const l = getLocale(locale);
  if (effects.length === 0) return l.noEffects;
  return effects.map((e) => formatEffect(e, locale)).join(l.effectSeparator);
}

// === Structured Data API (for badge/tag UI rendering) ===

export interface StructuredEffectData {
  icon: string;
  color: number;
  valueText: string;
  targetText: string;
}

const EFFECT_STYLE: Record<string, { icon: string; color: number }> = {
  DAMAGE: { icon: '\u2694', color: 0xff4444 },
  HEAL: { icon: '+', color: 0x44cc44 },
  SHIELD: { icon: '\u25C6', color: 0x4a9eff },
  MOVE: { icon: '>', color: 0xffcc00 },
  PUSH: { icon: '>>', color: 0xff8844 },
  BUFF: { icon: '\u25B2', color: 0x44cc44 },
  DEBUFF: { icon: '\u25BC', color: 0xaa44ff },
  DELAY_TURN: { icon: '\u25F7', color: 0x8888aa },
  ADVANCE_TURN: { icon: '\u25F4', color: 0x4a9eff },
  REPOSITION: { icon: '\u21C4', color: 0xff8844 },
  DELAYED: { icon: '\u23F3', color: 0xffcc00 },
  SWAP: { icon: '\u2194', color: 0xff8844 },
};

function buildValueText(effect: ActionEffect, locale?: Locale): string {
  const l = getLocale(locale);
  const stat = effect.stat ? (l.stat[effect.stat] ?? effect.stat) : '';
  const val = effect.value ?? 0;

  switch (effect.type) {
    case 'DAMAGE':
    case 'HEAL':
    case 'SHIELD':
      return stat ? `${stat}x${val}` : `${val}`;
    case 'MOVE':
      return l.position[(effect.position as Position) ?? 'FRONT'] ?? '';
    case 'PUSH':
    case 'REPOSITION':
      return l.position[(effect.position as Position) ?? 'BACK'] ?? '';
    case 'BUFF':
    case 'DEBUFF':
      return `${l.buffType[effect.buffType ?? ''] ?? effect.buffType ?? ''} ${effect.duration ?? 0}T`;
    case 'DELAY_TURN':
    case 'ADVANCE_TURN':
      return `${val}`;
    case 'DELAYED':
      return `${effect.delayRounds ?? 0}T`;
    case 'SWAP':
      return '';
    default:
      return '';
  }
}

export function getStructuredEffect(effect: ActionEffect, locale?: Locale): StructuredEffectData {
  const style = EFFECT_STYLE[effect.type] ?? { icon: '?', color: 0x888888 };
  const targetText = effect.target ? formatTarget(effect.target, locale) : '';

  // SWAP: 두 타겟 모두 표시
  let finalTarget = targetText;
  if (effect.type === 'SWAP' && effect.swapTarget) {
    const swapText = formatTarget(effect.swapTarget, locale);
    finalTarget = `${targetText}\u2194${swapText}`;
  }

  return {
    icon: style.icon,
    color: style.color,
    valueText: buildValueText(effect, locale),
    targetText: finalTarget,
  };
}

export interface StructuredConditionData {
  text: string;
  isAlways: boolean;
}

export function getStructuredCondition(condition: ActionCondition, locale?: Locale): StructuredConditionData {
  return {
    text: formatCondition(condition, locale),
    isAlways: condition.type === 'ALWAYS',
  };
}

// === Slot Formatting ===

export function formatActionSlot(slot: ActionSlot, locale?: Locale): string {
  const l = getLocale(locale);
  const condText = formatCondition(slot.condition, locale);
  const effectsText = formatEffects(slot.action.effects, locale);
  const name = slot.action.name;
  const tag = slot.action.defensivePriority ? ` ${l.defensiveTag}` : '';

  return template(l.slotFormat, {
    condition: condText,
    name: `${name}${tag}`,
    effects: effectsText,
  });
}
