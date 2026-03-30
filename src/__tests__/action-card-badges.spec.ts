import { describe, expect, it } from 'vitest';
import { buildActionCardBadgeModel } from '../utils/actionCardBadges';
import { Target, type ActionCondition, type ActionEffect } from '../types';

describe('buildActionCardBadgeModel', () => {
  it('self condition, enemy target, effect를 섹션별 배지로 분리한다', () => {
    const condition: ActionCondition = { type: 'POSITION_FRONT' };
    const effects: ActionEffect[] = [{ type: 'DAMAGE', stat: 'atk', value: 1.2, target: Target.ENEMY_FRONT }];

    const model = buildActionCardBadgeModel(condition, effects);

    expect(model.selfBadges).toEqual([{ text: '내 전열', tone: 'self' }]);
    expect(model.targetBadges).toEqual([{ text: '적 전열', tone: 'enemy' }]);
    expect(model.effectBadges).toEqual([{ text: '공격 ATKx1.2', tone: 'effect' }]);
  });

  it('적 HP 조건과 자기 대상 효과를 함께 유지한다', () => {
    const condition: ActionCondition = { type: 'ENEMY_HP_BELOW', value: 30 };
    const effects: ActionEffect[] = [{ type: 'SHIELD', stat: 'grd', value: 1.1, target: Target.SELF }];

    const model = buildActionCardBadgeModel(condition, effects);

    expect(model.selfBadges).toEqual([]);
    expect(model.targetBadges).toEqual([
      { text: '적 HP 30%↓', tone: 'enemy' },
      { text: '자신', tone: 'self' },
    ]);
    expect(model.effectBadges).toEqual([{ text: '실드 GRDx1.1', tone: 'effect' }]);
  });

  it('복합 효과는 여러 대상 배지를 dedupe하며 swap 대상도 포함한다', () => {
    const condition: ActionCondition = { type: 'ALLY_HP_BELOW', value: 40 };
    const effects: ActionEffect[] = [
      { type: 'HEAL', value: 15, target: Target.ALLY_LOWEST_HP },
      { type: 'BUFF', buffType: 'COVER', duration: 1, target: Target.ALLY_LOWEST_HP },
      { type: 'SWAP', target: Target.ENEMY_BACK, swapTarget: Target.ENEMY_FRONT },
    ];

    const model = buildActionCardBadgeModel(condition, effects);

    expect(model.selfBadges).toEqual([]);
    expect(model.targetBadges).toEqual([
      { text: '아군 HP 40%↓', tone: 'ally' },
      { text: '아군 최저 HP', tone: 'ally' },
      { text: '적 후열', tone: 'enemy' },
      { text: '적 전열', tone: 'enemy' },
    ]);
    expect(model.effectBadges).toEqual([
      { text: '회복 15', tone: 'effect' },
      { text: '버프 엄호 1T', tone: 'effect' },
      { text: '교체', tone: 'effect' },
    ]);
  });
});
