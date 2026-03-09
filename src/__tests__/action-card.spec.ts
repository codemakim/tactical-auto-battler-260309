import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, Rarity } from '../types';
import type { Action, ActionCondition, ActionSlot } from '../types';
import {
  filterActionsByClass,
  generateRewardOptions,
  replaceActionSlot,
  resetRunActions,
} from '../systems/ActionCardSystem';
import { ACTION_POOL } from '../data/ActionPool';

// --- 테스트용 헬퍼 액션 ---

function makeAction(id: string, overrides: Partial<Action> = {}): Action {
  return {
    id,
    name: id,
    description: `Test action ${id}`,
    effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: 'ENEMY_FRONT' }],
    ...overrides,
  };
}

describe('액션 카드 시스템', () => {
  beforeEach(() => resetUnitCounter());

  // === 1. 클래스 제한 필터링 ===

  describe('클래스 제한 필터링 (filterActionsByClass)', () => {
    const warriorAction = makeAction('warrior_special', {
      classRestriction: CharacterClass.WARRIOR,
      rarity: Rarity.RARE,
    });
    const archerAction = makeAction('archer_special', {
      classRestriction: CharacterClass.ARCHER,
      rarity: Rarity.RARE,
    });
    const universalAction1 = makeAction('universal_1', { rarity: Rarity.COMMON });
    const universalAction2 = makeAction('universal_2', { rarity: Rarity.COMMON });

    const allActions = [warriorAction, archerAction, universalAction1, universalAction2];

    it('워리어는 워리어 전용 + 범용 액션을 사용할 수 있다', () => {
      const filtered = filterActionsByClass(allActions, CharacterClass.WARRIOR);

      expect(filtered).toContainEqual(warriorAction);
      expect(filtered).toContainEqual(universalAction1);
      expect(filtered).toContainEqual(universalAction2);
      expect(filtered).not.toContainEqual(archerAction);
      expect(filtered).toHaveLength(3);
    });

    it('아처는 아처 전용 + 범용 액션만 사용할 수 있다', () => {
      const filtered = filterActionsByClass(allActions, CharacterClass.ARCHER);

      expect(filtered).toContainEqual(archerAction);
      expect(filtered).toContainEqual(universalAction1);
      expect(filtered).toContainEqual(universalAction2);
      expect(filtered).not.toContainEqual(warriorAction);
      expect(filtered).toHaveLength(3);
    });

    it('가디언은 범용 액션만 사용할 수 있다 (전용 액션 없음)', () => {
      const filtered = filterActionsByClass(allActions, CharacterClass.GUARDIAN);

      expect(filtered).toContainEqual(universalAction1);
      expect(filtered).toContainEqual(universalAction2);
      expect(filtered).not.toContainEqual(warriorAction);
      expect(filtered).not.toContainEqual(archerAction);
      expect(filtered).toHaveLength(2);
    });
  });

  // === 2. 보상 생성 (5개 선택) ===

  describe('보상 옵션 생성 (generateRewardOptions)', () => {
    it('주어진 풀에서 정확히 5개의 보상 옵션을 생성한다', () => {
      const result = generateRewardOptions(ACTION_POOL, CharacterClass.WARRIOR, 5, 42);

      expect(result).toHaveLength(5);
    });

    it('모든 보상 옵션이 해당 클래스와 호환된다', () => {
      const result = generateRewardOptions(ACTION_POOL, CharacterClass.ARCHER, 5, 123);

      for (const action of result) {
        expect(
          !action.classRestriction || action.classRestriction === CharacterClass.ARCHER,
        ).toBe(true);
      }
    });

    it('같은 시드를 사용하면 같은 결과를 반환한다 (결정론적)', () => {
      const result1 = generateRewardOptions(ACTION_POOL, CharacterClass.WARRIOR, 5, 999);
      const result2 = generateRewardOptions(ACTION_POOL, CharacterClass.WARRIOR, 5, 999);

      expect(result1.map((a) => a.id)).toEqual(result2.map((a) => a.id));
    });

    it('풀이 요청 수보다 작으면 가능한 만큼만 반환한다', () => {
      const smallPool = [makeAction('a'), makeAction('b')];
      const result = generateRewardOptions(smallPool, CharacterClass.WARRIOR, 5, 1);

      expect(result).toHaveLength(2);
    });
  });

  // === 3. 액션 슬롯 교체 ===

  describe('액션 슬롯 교체 (replaceActionSlot)', () => {
    it('슬롯 0을 새 액션으로 교체할 수 있다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
        [
          { condition: { type: 'POSITION_FRONT' }, action: makeAction('slot0_action') },
          { condition: { type: 'POSITION_BACK' }, action: makeAction('slot1_action') },
        ],
      );

      // unit has 3 slots: slot0_action, slot1_action, basic action
      expect(unit.actionSlots).toHaveLength(3);

      const newAction = makeAction('new_power_attack', { rarity: Rarity.EPIC });
      const newCondition: ActionCondition = { type: 'HP_ABOVE', value: 50 };

      const updated = replaceActionSlot(unit, 0, newAction, newCondition);

      expect(updated).not.toBeNull();
      expect(updated!.actionSlots[0].action.id).toBe('new_power_attack');
      expect(updated!.actionSlots[0].condition.type).toBe('HP_ABOVE');
    });

    it('다른 슬롯은 변경되지 않는다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
        [
          { condition: { type: 'POSITION_FRONT' }, action: makeAction('slot0_action') },
          { condition: { type: 'POSITION_BACK' }, action: makeAction('slot1_action') },
        ],
      );

      const newAction = makeAction('replaced');
      const newCondition: ActionCondition = { type: 'ALWAYS' };

      const updated = replaceActionSlot(unit, 0, newAction, newCondition);

      expect(updated!.actionSlots[1].action.id).toBe('slot1_action');
      expect(updated!.actionSlots[2].action.isBasic).toBe(true);
    });

    it('마지막 슬롯(기본 액션)은 교체할 수 없다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
        [
          { condition: { type: 'POSITION_FRONT' }, action: makeAction('slot0') },
          { condition: { type: 'POSITION_BACK' }, action: makeAction('slot1') },
        ],
      );

      const lastIndex = unit.actionSlots.length - 1;
      const result = replaceActionSlot(unit, lastIndex, makeAction('hack'), { type: 'ALWAYS' });

      expect(result).toBeNull();
    });

    it('유효하지 않은 인덱스는 null을 반환한다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      expect(replaceActionSlot(unit, -1, makeAction('x'), { type: 'ALWAYS' })).toBeNull();
      expect(replaceActionSlot(unit, 99, makeAction('x'), { type: 'ALWAYS' })).toBeNull();
    });
  });

  // === 4. 런 리셋 ===

  describe('런 리셋 (resetRunActions)', () => {
    it('리셋 후 기본 액션만 남는다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
        [
          { condition: { type: 'POSITION_FRONT' }, action: makeAction('temp_action_1') },
          { condition: { type: 'HP_BELOW', value: 30 }, action: makeAction('temp_action_2') },
        ],
      );

      // 리셋 전: 3개 슬롯 (임시 2 + 기본 1)
      expect(unit.actionSlots).toHaveLength(3);

      const reset = resetRunActions(unit);

      // 리셋 후: 기본 액션 1개만 남음
      expect(reset.actionSlots).toHaveLength(1);
      expect(reset.actionSlots[0].action.isBasic).toBe(true);
      expect(reset.actionSlots[0].action.id).toBe('warrior_shield_bash');
    });

    it('스탯은 변경되지 않는다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
        [{ condition: { type: 'ALWAYS' }, action: makeAction('temp') }],
      );

      // 스탯 수정
      unit.stats.hp = 50;
      unit.stats.atk = 99;

      const reset = resetRunActions(unit);

      expect(reset.stats.hp).toBe(50);
      expect(reset.stats.atk).toBe(99);
      expect(reset.stats.maxHp).toBe(unit.stats.maxHp);
    });

    it('원본 유닛은 변경되지 않는다 (불변성)', () => {
      const unit = createUnit(
        createCharacterDef('A', CharacterClass.ARCHER),
        Team.PLAYER,
        Position.BACK,
        [{ condition: { type: 'ALWAYS' }, action: makeAction('temp') }],
      );

      const originalSlotCount = unit.actionSlots.length;
      resetRunActions(unit);

      expect(unit.actionSlots).toHaveLength(originalSlotCount);
    });
  });
});
