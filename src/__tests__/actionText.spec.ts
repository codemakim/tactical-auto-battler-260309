import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatCondition,
  formatTarget,
  formatEffect,
  formatEffects,
  formatActionSlot,
  setDefaultLocale,
  getDefaultLocale,
  getStructuredEffect,
  getStructuredCondition,
  formatSlotSummary,
  formatSlotsSummary,
} from '../utils/actionText';
import { Target, type ActionCondition, type ActionEffect, type ActionSlot } from '../types';
import { CLASS_DEFINITIONS } from '../data/ClassDefinitions';

beforeEach(() => {
  setDefaultLocale('ko');
});

// === formatCondition ===

describe('formatCondition', () => {
  it('ALWAYS', () => {
    expect(formatCondition({ type: 'ALWAYS' })).toBe('항상');
    expect(formatCondition({ type: 'ALWAYS' }, 'en')).toBe('Always');
  });

  it('POSITION_FRONT', () => {
    expect(formatCondition({ type: 'POSITION_FRONT' })).toBe('자신 전열');
    expect(formatCondition({ type: 'POSITION_FRONT' }, 'en')).toBe('Self front');
  });

  it('POSITION_BACK', () => {
    expect(formatCondition({ type: 'POSITION_BACK' })).toBe('자신 후열');
  });

  it('HP_BELOW with value', () => {
    expect(formatCondition({ type: 'HP_BELOW', value: 50 })).toBe('HP 50% 이하');
    expect(formatCondition({ type: 'HP_BELOW', value: 50 }, 'en')).toBe('HP ≤50%');
  });

  it('HP_ABOVE with value', () => {
    expect(formatCondition({ type: 'HP_ABOVE', value: 70 })).toBe('HP 70% 이상');
  });

  it('ENEMY_FRONT_EXISTS', () => {
    expect(formatCondition({ type: 'ENEMY_FRONT_EXISTS' })).toBe('적 전열 존재');
  });

  it('ENEMY_BACK_EXISTS', () => {
    expect(formatCondition({ type: 'ENEMY_BACK_EXISTS' })).toBe('적 후열 존재');
  });

  it('ALLY_HP_BELOW with value', () => {
    expect(formatCondition({ type: 'ALLY_HP_BELOW', value: 40 })).toBe('아군 HP 40% 이하');
  });

  it('LOWEST_HP_ENEMY', () => {
    expect(formatCondition({ type: 'LOWEST_HP_ENEMY' })).toBe('항상');
  });

  it('FIRST_ACTION_THIS_ROUND', () => {
    expect(formatCondition({ type: 'FIRST_ACTION_THIS_ROUND' })).toBe('첫 행동');
  });

  it('HAS_HERO_BUFF', () => {
    expect(formatCondition({ type: 'HAS_HERO_BUFF' })).toBe('영웅 버프');
  });

  it('ENEMY_HP_BELOW with value', () => {
    expect(formatCondition({ type: 'ENEMY_HP_BELOW', value: 30 })).toBe('적 HP 30% 이하');
    expect(formatCondition({ type: 'ENEMY_HP_BELOW', value: 30 }, 'en')).toBe('Enemy HP ≤30%');
  });
});

// === formatTarget ===

describe('formatTarget', () => {
  it('SELF', () => {
    expect(formatTarget(Target.SELF)).toBe('자신');
    expect(formatTarget(Target.SELF, 'en')).toBe('self');
  });

  it('ENEMY_FRONT', () => {
    expect(formatTarget(Target.ENEMY_FRONT)).toBe('적 전열');
    expect(formatTarget(Target.ENEMY_FRONT, 'en')).toBe('enemy front');
  });

  it('ENEMY_BACK', () => {
    expect(formatTarget(Target.ENEMY_BACK)).toBe('적 후열');
  });

  it('ENEMY_ANY', () => {
    expect(formatTarget(Target.ENEMY_ANY)).toBe('적 최저HP');
    expect(formatTarget(Target.ENEMY_ANY, 'en')).toBe('enemy lowest HP');
  });

  it('ALLY_LOWEST_HP', () => {
    expect(formatTarget(Target.ALLY_LOWEST_HP)).toBe('아군 최저HP');
  });

  it('ALLY_ANY', () => {
    expect(formatTarget(Target.ALLY_ANY)).toBe('아군');
  });

  it('ENEMY_BACK_LOWEST_HP', () => {
    expect(formatTarget(Target.ENEMY_BACK_LOWEST_HP)).toBe('적 후열 최저HP');
  });

  it('ENEMY_BACK_HIGHEST_ATK', () => {
    expect(formatTarget(Target.ENEMY_BACK_HIGHEST_ATK)).toBe('적 후열 최고ATK');
    expect(formatTarget(Target.ENEMY_BACK_HIGHEST_ATK, 'en')).toBe('enemy back highest ATK');
  });

  it('custom target combination', () => {
    const custom = { side: 'ENEMY' as const, position: 'ANY' as const, select: 'RANDOM' as const };
    expect(formatTarget(custom)).toBe('적 무작위');
    expect(formatTarget(custom, 'en')).toBe('enemy random');
  });
});

// === formatEffect ===

describe('formatEffect', () => {
  it('DAMAGE with stat', () => {
    const e: ActionEffect = { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT };
    expect(formatEffect(e)).toBe('적 전열에게 ATKx1.2 피해');
    expect(formatEffect(e, 'en')).toBe('ATKx1.2 damage to enemy front');
  });

  it('DAMAGE without stat (flat)', () => {
    const e: ActionEffect = { type: 'DAMAGE', value: 1.5, target: Target.ENEMY_ANY };
    expect(formatEffect(e)).toBe('적 최저HP에게 1.5 피해');
  });

  it('HEAL with stat', () => {
    const e: ActionEffect = { type: 'HEAL', value: 1.0, stat: 'atk', target: Target.ALLY_LOWEST_HP };
    expect(formatEffect(e)).toBe('아군 최저HP ATKx1 회복');
  });

  it('HEAL flat', () => {
    const e: ActionEffect = { type: 'HEAL', value: 15, target: Target.SELF };
    expect(formatEffect(e)).toBe('자신 15 회복');
    expect(formatEffect(e, 'en')).toBe('Heal self for 15');
  });

  it('SHIELD with stat', () => {
    const e: ActionEffect = { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF };
    expect(formatEffect(e)).toBe('자신에게 GRDx0.8 실드');
    expect(formatEffect(e, 'en')).toBe('GRDx0.8 shield to self');
  });

  it('SHIELD flat', () => {
    const e: ActionEffect = { type: 'SHIELD', value: 10, target: Target.SELF };
    expect(formatEffect(e)).toBe('자신에게 10 실드');
  });

  it('MOVE', () => {
    const e: ActionEffect = { type: 'MOVE', target: Target.SELF, position: 'FRONT' };
    expect(formatEffect(e)).toBe('전열(으)로 이동');
    expect(formatEffect(e, 'en')).toBe('Move to front');
  });

  it('PUSH', () => {
    const e: ActionEffect = { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' };
    expect(formatEffect(e)).toBe('적 전열을 후열(으)로 밀기');
    expect(formatEffect(e, 'en')).toBe('Push enemy front to back');
  });

  it('BUFF', () => {
    const e: ActionEffect = { type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF };
    expect(formatEffect(e)).toBe('자신에게 엄호 1턴');
    expect(formatEffect(e, 'en')).toBe('Apply Cover to self for 1T');
  });

  it('DEBUFF', () => {
    const e: ActionEffect = {
      type: 'DEBUFF',
      buffType: 'GUARD_DOWN',
      duration: 2,
      value: 2,
      target: Target.ENEMY_FRONT,
    };
    expect(formatEffect(e)).toBe('적 전열에게 방어력 감소 2턴');
    expect(formatEffect(e, 'en')).toBe('Apply Guard Down to enemy front for 2T');
  });

  it('DELAY_TURN', () => {
    const e: ActionEffect = { type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY };
    expect(formatEffect(e)).toBe('적 최저HP 턴 1 지연');
  });

  it('ADVANCE_TURN', () => {
    const e: ActionEffect = { type: 'ADVANCE_TURN', value: 1, target: Target.SELF };
    expect(formatEffect(e)).toBe('자신 턴 1 앞당김');
    expect(formatEffect(e, 'en')).toBe('Advance self turn by 1');
  });

  it('SWAP', () => {
    const e: ActionEffect = { type: 'SWAP', target: Target.ENEMY_BACK, swapTarget: Target.ENEMY_FRONT };
    expect(formatEffect(e)).toBe('적 후열 ↔ 적 전열 교환');
    expect(formatEffect(e, 'en')).toBe('Swap enemy back ↔ enemy front');
  });

  it('DELAYED', () => {
    const e: ActionEffect = {
      type: 'DELAYED',
      delayedType: 'DAMAGE',
      delayRounds: 2,
      value: 1.0,
      stat: 'atk',
      target: Target.ENEMY_FRONT,
    };
    const ko = formatEffect(e);
    expect(ko).toContain('2턴 후');
    expect(ko).toContain('피해');

    const en = formatEffect(e, 'en');
    expect(en).toContain('after 2T');
    expect(en).toContain('damage');
  });

  it('REPOSITION', () => {
    const e: ActionEffect = { type: 'REPOSITION', target: Target.ENEMY_FRONT, position: 'BACK' };
    expect(formatEffect(e)).toBe('적 전열을 후열(으)로 재배치');
  });
});

// === formatEffects ===

describe('formatEffects', () => {
  it('multiple effects joined with separator', () => {
    const effects: ActionEffect[] = [
      { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
      { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
    ];
    expect(formatEffects(effects)).toBe('적 전열에게 ATKx1.2 피해, 자신에게 GRDx0.8 실드');
  });

  it('empty effects array', () => {
    expect(formatEffects([])).toBe('효과 없음');
    expect(formatEffects([], 'en')).toBe('No effects');
  });

  it('single effect', () => {
    const effects: ActionEffect[] = [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }];
    expect(formatEffects(effects)).toBe('전열(으)로 이동');
  });
});

// === formatActionSlot ===

describe('formatActionSlot', () => {
  it('Warrior Shield Bash', () => {
    const slot: ActionSlot = {
      condition: { type: 'POSITION_FRONT' },
      action: {
        id: 'warrior_shield_bash',
        name: 'Shield Bash',
        description: '',
        effects: [
          { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT },
          { type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF },
        ],
      },
    };
    expect(formatActionSlot(slot)).toBe('[자신 전열] Shield Bash: 적 전열에게 ATKx1.2 피해, 자신에게 GRDx0.8 실드');
    expect(formatActionSlot(slot, 'en')).toBe(
      '[Self front] Shield Bash: ATKx1.2 damage to enemy front, GRDx0.8 shield to self',
    );
  });

  it('Lancer Charge (3 effects)', () => {
    const slot: ActionSlot = {
      condition: { type: 'POSITION_BACK' },
      action: {
        id: 'lancer_charge',
        name: 'Charge',
        description: '',
        effects: [
          { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
          { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
          { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
        ],
      },
    };
    const result = formatActionSlot(slot);
    expect(result).toContain('[자신 후열]');
    expect(result).toContain('Charge');
    expect(result).toContain('전열(으)로 이동');
    expect(result).toContain('ATKx1.4 피해');
    expect(result).toContain('후열(으)로 밀기');
  });

  it('defensivePriority tag', () => {
    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'test',
        name: 'Guard',
        description: '',
        defensivePriority: true,
        effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF }],
      },
    };
    expect(formatActionSlot(slot)).toContain('[우선]');
    expect(formatActionSlot(slot, 'en')).toContain('[Priority]');
  });
});

// === getStructuredEffect ===

describe('getStructuredEffect', () => {
  it('DAMAGE with stat', () => {
    const e: ActionEffect = { type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT };
    const s = getStructuredEffect(e);
    expect(s.icon).toBe('✦');
    expect(s.color).toBe(0xff4444);
    expect(s.valueText).toBe('ATKx1.2');
    expect(s.targetText).toBe('적 전열');
  });

  it('DAMAGE flat', () => {
    const s = getStructuredEffect({ type: 'DAMAGE', value: 1.5, target: Target.ENEMY_ANY });
    expect(s.valueText).toBe('1.5');
    expect(s.targetText).toBe('적 최저HP');
  });

  it('SHIELD with stat', () => {
    const s = getStructuredEffect({ type: 'SHIELD', value: 0.8, stat: 'grd', target: Target.SELF });
    expect(s.icon).toBe('◈');
    expect(s.color).toBe(0x4a9eff);
    expect(s.valueText).toBe('GRDx0.8');
    expect(s.targetText).toBe('자신');
  });

  it('HEAL flat', () => {
    const s = getStructuredEffect({ type: 'HEAL', value: 15, target: Target.SELF });
    expect(s.icon).toBe('✚');
    expect(s.color).toBe(0x44cc44);
    expect(s.valueText).toBe('15');
  });

  it('MOVE', () => {
    const s = getStructuredEffect({ type: 'MOVE', target: Target.SELF, position: 'FRONT' });
    expect(s.icon).toBe('△');
    expect(s.valueText).toBe('전열');
    expect(s.targetText).toBe('자신');
  });

  it('PUSH', () => {
    const s = getStructuredEffect({ type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' });
    expect(s.icon).toBe('▷');
    expect(s.valueText).toBe('후열');
    expect(s.targetText).toBe('적 전열');
  });

  it('BUFF', () => {
    const s = getStructuredEffect({ type: 'BUFF', buffType: 'COVER', duration: 1, value: 0, target: Target.SELF });
    expect(s.icon).toBe('▲');
    expect(s.color).toBe(0x44cc44);
    expect(s.valueText).toBe('엄호 1T');
    expect(s.targetText).toBe('자신');
  });

  it('DEBUFF', () => {
    const s = getStructuredEffect({
      type: 'DEBUFF',
      buffType: 'GUARD_DOWN',
      duration: 2,
      value: 2,
      target: Target.ENEMY_FRONT,
    });
    expect(s.icon).toBe('▼');
    expect(s.color).toBe(0xaa44ff);
    expect(s.valueText).toBe('방어력 감소 2T');
  });

  it('DELAY_TURN', () => {
    const s = getStructuredEffect({ type: 'DELAY_TURN', value: 1, target: Target.ENEMY_ANY });
    expect(s.valueText).toBe('1');
  });

  it('ADVANCE_TURN', () => {
    const s = getStructuredEffect({ type: 'ADVANCE_TURN', value: 1, target: Target.SELF });
    expect(s.valueText).toBe('1');
  });

  it('SWAP', () => {
    const s = getStructuredEffect({ type: 'SWAP', target: Target.ENEMY_BACK, swapTarget: Target.ENEMY_FRONT });
    expect(s.icon).toBe('⇄');
    expect(s.targetText).toContain('\u2194');
    expect(s.targetText).toContain('적 후열');
    expect(s.targetText).toContain('적 전열');
  });

  it('DELAYED', () => {
    const s = getStructuredEffect({
      type: 'DELAYED',
      delayedType: 'DAMAGE',
      delayRounds: 2,
      value: 1.0,
      stat: 'atk',
      target: Target.ENEMY_FRONT,
    });
    expect(s.valueText).toBe('2T');
  });

  it('locale en', () => {
    const s = getStructuredEffect({ type: 'DAMAGE', value: 1.2, stat: 'atk', target: Target.ENEMY_FRONT }, 'en');
    expect(s.valueText).toBe('ATKx1.2');
    expect(s.targetText).toBe('enemy front');
  });
});

// === getStructuredCondition ===

describe('getStructuredCondition', () => {
  it('ALWAYS returns isAlways true', () => {
    const c = getStructuredCondition({ type: 'ALWAYS' });
    expect(c.isAlways).toBe(true);
    expect(c.text).toBe('항상');
  });

  it('non-ALWAYS returns isAlways false', () => {
    const c = getStructuredCondition({ type: 'POSITION_FRONT' });
    expect(c.isAlways).toBe(false);
    expect(c.text).toBe('자신 전열');
  });

  it('locale en', () => {
    const c = getStructuredCondition({ type: 'HP_BELOW', value: 50 }, 'en');
    expect(c.text).toBe('HP ≤50%');
    expect(c.isAlways).toBe(false);
  });
});

// === ClassDefinitions structured integration ===

describe('ClassDefinitions structured integration', () => {
  it('all testActionSlots effects produce valid structured data', () => {
    for (const [className, def] of Object.entries(CLASS_DEFINITIONS)) {
      for (const slot of def.testActionSlots) {
        for (const effect of slot.action.effects) {
          const s = getStructuredEffect(effect, 'ko');
          expect(s.icon, `${className} ${slot.action.name} icon`).toBeTruthy();
          expect(typeof s.color, `${className} ${slot.action.name} color`).toBe('number');
          // valueText가 있는지 (SWAP만 빈 문자열 허용)
          if (effect.type !== 'SWAP') {
            expect(s.valueText, `${className} ${slot.action.name} valueText`).toBeTruthy();
          }
        }
      }
    }
  });
});

// === formatSlotSummary ===

describe('formatSlotSummary', () => {
  it('conditional slot shows IF → format', () => {
    const slot: ActionSlot = {
      condition: { type: 'POSITION_FRONT' },
      action: { id: 't', name: 'Shield Bash', description: '', effects: [] },
    };
    expect(formatSlotSummary(slot, 0)).toBe('\u2460 IF 자신 전열 → Shield Bash');
    expect(formatSlotSummary(slot, 0, 'en')).toBe('\u2460 IF Self front → Shield Bash');
  });

  it('ALWAYS condition omits IF', () => {
    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: { id: 't', name: 'Strike', description: '', effects: [] },
    };
    expect(formatSlotSummary(slot, 1)).toBe('\u2461 → Strike');
    expect(formatSlotSummary(slot, 1, 'en')).toBe('\u2461 → Strike');
  });

  it('index numbering', () => {
    const slot: ActionSlot = {
      condition: { type: 'HP_BELOW', value: 50 },
      action: { id: 't', name: 'Fortify', description: '', effects: [] },
    };
    expect(formatSlotSummary(slot, 2)).toContain('\u2462');
    expect(formatSlotSummary(slot, 2)).toContain('HP 50% 이하');
  });
});

describe('formatSlotsSummary', () => {
  it('returns array of formatted lines', () => {
    const slots: ActionSlot[] = [
      {
        condition: { type: 'POSITION_FRONT' },
        action: { id: 't1', name: 'Shield Bash', description: '', effects: [] },
      },
      {
        condition: { type: 'HP_BELOW', value: 50 },
        action: { id: 't2', name: 'Fortify', description: '', effects: [] },
      },
      {
        condition: { type: 'POSITION_BACK' },
        action: { id: 't3', name: 'Advance', description: '', effects: [] },
      },
    ];
    const lines = formatSlotsSummary(slots);
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('\u2460');
    expect(lines[1]).toContain('\u2461');
    expect(lines[2]).toContain('\u2462');
    expect(lines[0]).toContain('Shield Bash');
    expect(lines[2]).toContain('자신 후열');
  });
});

// === Locale switching ===

describe('locale switching', () => {
  it('setDefaultLocale changes default', () => {
    setDefaultLocale('en');
    expect(getDefaultLocale()).toBe('en');
    expect(formatCondition({ type: 'ALWAYS' })).toBe('Always');

    setDefaultLocale('ko');
    expect(formatCondition({ type: 'ALWAYS' })).toBe('항상');
  });
});

// === ClassDefinitions integration ===

describe('ClassDefinitions integration', () => {
  it('all testActionSlots produce non-empty text without errors', () => {
    for (const [className, def] of Object.entries(CLASS_DEFINITIONS)) {
      for (const slot of def.testActionSlots) {
        const ko = formatActionSlot(slot, 'ko');
        const en = formatActionSlot(slot, 'en');
        expect(ko, `${className} slot ${slot.action.name} (ko)`).toBeTruthy();
        expect(en, `${className} slot ${slot.action.name} (en)`).toBeTruthy();
        // 미치환 placeholder가 남아있지 않은지 확인
        expect(ko, `${className} ${slot.action.name} has unresolved placeholder`).not.toContain('{');
        expect(en, `${className} ${slot.action.name} has unresolved placeholder`).not.toContain('{');
      }
    }
  });
});
