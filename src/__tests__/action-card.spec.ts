import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, Rarity } from '../types';
import type { Action, ActionCondition } from '../types';
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
    it('캐릭터는 기본 3개 액션 슬롯을 가진다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      expect(unit.actionSlots).toHaveLength(3);
    });

    it('슬롯 0(최우선)을 새 액션으로 교체할 수 있다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      const newAction = makeAction('new_power_attack', { rarity: Rarity.EPIC });
      const newCondition: ActionCondition = { type: 'HP_ABOVE', value: 50 };

      const updated = replaceActionSlot(unit, 0, newAction, newCondition);

      expect(updated).not.toBeNull();
      expect(updated!.actionSlots[0].action.id).toBe('new_power_attack');
      expect(updated!.actionSlots[0].condition.type).toBe('HP_ABOVE');
    });

    it('슬롯 1을 교체할 수 있다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      const newAction = makeAction('slot1_replacement');
      const updated = replaceActionSlot(unit, 1, newAction, { type: 'ALWAYS' });

      expect(updated).not.toBeNull();
      expect(updated!.actionSlots[1].action.id).toBe('slot1_replacement');
    });

    it('슬롯 2(마지막)도 교체할 수 있다 — 모든 슬롯이 교체 대상이다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      const lastIndex = unit.actionSlots.length - 1; // 2
      const newAction = makeAction('last_slot_replacement', { rarity: Rarity.LEGENDARY });
      const updated = replaceActionSlot(unit, lastIndex, newAction, { type: 'ALWAYS' });

      // §6: 기본 액션 포함 모든 슬롯 교체 가능
      expect(updated).not.toBeNull();
      expect(updated!.actionSlots[lastIndex].action.id).toBe('last_slot_replacement');
    });

    it('교체하지 않은 다른 슬롯은 그대로 유지된다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      const slot1Before = unit.actionSlots[1].action.id;
      const slot2Before = unit.actionSlots[2].action.id;

      const updated = replaceActionSlot(unit, 0, makeAction('replaced'), { type: 'ALWAYS' });

      expect(updated!.actionSlots[1].action.id).toBe(slot1Before);
      expect(updated!.actionSlots[2].action.id).toBe(slot2Before);
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

    it('원본 유닛은 변경되지 않는다 (불변성)', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      const originalSlot0Id = unit.actionSlots[0].action.id;
      replaceActionSlot(unit, 0, makeAction('new'), { type: 'ALWAYS' });

      expect(unit.actionSlots[0].action.id).toBe(originalSlot0Id);
    });

    it('3개 슬롯을 모두 교체할 수 있다', () => {
      let unit = createUnit(
        createCharacterDef('L', CharacterClass.LANCER),
        Team.PLAYER,
        Position.FRONT,
      );

      // 모든 슬롯을 새 액션으로 교체
      unit = replaceActionSlot(unit, 0, makeAction('run_action_a'), { type: 'POSITION_FRONT' })!;
      unit = replaceActionSlot(unit, 1, makeAction('run_action_b'), { type: 'HP_BELOW', value: 30 })!;
      unit = replaceActionSlot(unit, 2, makeAction('run_action_c'), { type: 'ALWAYS' })!;

      expect(unit.actionSlots[0].action.id).toBe('run_action_a');
      expect(unit.actionSlots[1].action.id).toBe('run_action_b');
      expect(unit.actionSlots[2].action.id).toBe('run_action_c');
    });
  });

  // === 4. 런 리셋 ===

  describe('런 리셋 (resetRunActions)', () => {
    it('리셋 후 원래 3개 기본 슬롯으로 복원된다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      const originalSlot0Id = unit.actionSlots[0].action.id;
      const originalSlot1Id = unit.actionSlots[1].action.id;
      const originalSlot2Id = unit.actionSlots[2].action.id;

      // 런 중 슬롯 교체
      let modifiedUnit = replaceActionSlot(unit, 0, makeAction('run_temp_1'), { type: 'ALWAYS' })!;
      modifiedUnit = replaceActionSlot(modifiedUnit, 2, makeAction('run_temp_2'), { type: 'ALWAYS' })!;
      expect(modifiedUnit.actionSlots[0].action.id).toBe('run_temp_1');
      expect(modifiedUnit.actionSlots[2].action.id).toBe('run_temp_2');

      // 런 리셋 → 원래 3개 슬롯 복원
      const reset = resetRunActions(modifiedUnit);

      expect(reset.actionSlots).toHaveLength(3);
      expect(reset.actionSlots[0].action.id).toBe(originalSlot0Id);
      expect(reset.actionSlots[1].action.id).toBe(originalSlot1Id);
      expect(reset.actionSlots[2].action.id).toBe(originalSlot2Id);
    });

    it('3개 슬롯 모두 교체 후 리셋하면 원래 클래스 슬롯이 복원된다', () => {
      const unit = createUnit(
        createCharacterDef('A', CharacterClass.ARCHER),
        Team.PLAYER,
        Position.BACK,
      );

      // 모든 슬롯 교체
      let modified = replaceActionSlot(unit, 0, makeAction('x0'), { type: 'ALWAYS' })!;
      modified = replaceActionSlot(modified, 1, makeAction('x1'), { type: 'ALWAYS' })!;
      modified = replaceActionSlot(modified, 2, makeAction('x2'), { type: 'ALWAYS' })!;

      const reset = resetRunActions(modified);

      // Archer 기본 슬롯: archer_aimed_shot, archer_precise_shot, archer_quick_shot
      expect(reset.actionSlots[0].action.id).toBe('archer_aimed_shot');
      expect(reset.actionSlots[1].action.id).toBe('archer_precise_shot');
      expect(reset.actionSlots[2].action.id).toBe('archer_quick_shot');
    });

    it('스탯은 변경되지 않는다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      // 스탯 수정 (런 중 강화 시뮬레이션)
      const modifiedUnit = { ...unit, stats: { ...unit.stats, hp: 50, atk: 99 } };
      const reset = resetRunActions(modifiedUnit);

      expect(reset.stats.hp).toBe(50);
      expect(reset.stats.atk).toBe(99);
      expect(reset.stats.maxHp).toBe(unit.stats.maxHp);
    });

    it('원본 유닛은 변경되지 않는다 (불변성)', () => {
      const unit = createUnit(
        createCharacterDef('A', CharacterClass.ARCHER),
        Team.PLAYER,
        Position.BACK,
      );

      const modified = replaceActionSlot(unit, 0, makeAction('temp'), { type: 'ALWAYS' })!;
      resetRunActions(modified);

      // 리셋 후 modified 원본은 그대로
      expect(modified.actionSlots[0].action.id).toBe('temp');
    });

    it('리셋 후 baseActionSlots는 유지된다', () => {
      const unit = createUnit(
        createCharacterDef('W', CharacterClass.WARRIOR),
        Team.PLAYER,
        Position.FRONT,
      );

      const modified = replaceActionSlot(unit, 0, makeAction('temp'), { type: 'ALWAYS' })!;
      const reset = resetRunActions(modified);

      // baseActionSlots는 런 중에도 변하지 않으며, 리셋 후에도 동일
      expect(reset.baseActionSlots).toHaveLength(3);
      expect(reset.baseActionSlots[0].action.id).toBe(unit.baseActionSlots[0].action.id);
    });
  });
});
