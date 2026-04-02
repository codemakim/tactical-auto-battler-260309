import { describe, expect, it } from 'vitest';
import { buildActionCardBadgeModel } from '../utils/actionCardBadges';
import { Target, type ActionCondition, type ActionEffect } from '../types';

describe('buildActionCardBadgeModel', () => {
  it('조건은 나 기준으로 통일하고 효과 태그에 대상을 포함한다', () => {
    const condition: ActionCondition = { type: 'POSITION_FRONT' };
    const effects: ActionEffect[] = [{ type: 'DAMAGE', stat: 'atk', value: 1.2, target: Target.ENEMY_FRONT }];

    const model = buildActionCardBadgeModel(condition, effects);

    expect(model.selfBadges).toEqual([{ text: '나 전열', tone: 'self' }]);
    expect(model.targetBadges).toEqual([]);
    expect(model.effectBadges).toEqual([{ text: '✦ 적 전열 공격x1.2', tone: 'effect' }]);
  });

  it('적 HP 조건은 유지하고 자기 대상 실드는 나 실드로 표기한다', () => {
    const condition: ActionCondition = { type: 'ENEMY_HP_BELOW', value: 30 };
    const effects: ActionEffect[] = [{ type: 'SHIELD', stat: 'grd', value: 1.1, target: Target.SELF }];

    const model = buildActionCardBadgeModel(condition, effects);

    expect(model.selfBadges).toEqual([]);
    expect(model.targetBadges).toEqual([{ text: '적 HP 30%↓', tone: 'enemy' }]);
    expect(model.effectBadges).toEqual([{ text: '◈ 나 실드x1.1', tone: 'effect' }]);
  });

  it('복수 대상 효과는 각 효과에 대상을 붙여서 구분한다', () => {
    const condition: ActionCondition = { type: 'POSITION_FRONT' };
    const effects: ActionEffect[] = [
      { type: 'SHIELD', stat: 'grd', value: 1.0, target: Target.SELF },
      { type: 'SHIELD', stat: 'grd', value: 0.8, target: Target.ALLY_LOWEST_HP },
      { type: 'BUFF', buffType: 'COVER', duration: 1, target: Target.SELF },
    ];

    const model = buildActionCardBadgeModel(condition, effects);

    expect(model.selfBadges).toEqual([{ text: '나 전열', tone: 'self' }]);
    expect(model.targetBadges).toEqual([]);
    expect(model.effectBadges).toEqual([
      { text: '◈ 나 실드x1', tone: 'effect' },
      { text: '◈ 아군 최저 HP 실드x0.8', tone: 'effect' },
      { text: '▲ 나 엄호 1T', tone: 'effect' },
    ]);
  });

  it('이동과 밀침은 화살표 대신 문장형으로 표기한다', () => {
    const condition: ActionCondition = { type: 'POSITION_BACK' };
    const effects: ActionEffect[] = [
      { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
      { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
    ];

    const model = buildActionCardBadgeModel(condition, effects);

    expect(model.selfBadges).toEqual([{ text: '나 후열', tone: 'self' }]);
    expect(model.effectBadges).toEqual([
      { text: '△ 나 전열 이동', tone: 'effect' },
      { text: '▷ 적 전열 후열 밀침', tone: 'effect' },
    ]);
  });
});
