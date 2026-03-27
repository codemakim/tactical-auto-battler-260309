import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { createBattleState, restorePreBattleActions } from '../core/BattleEngine';
import { heroEditAction, canIntervene } from '../systems/HeroInterventionSystem';
import { resetBattleActions } from '../systems/ActionCardSystem';
import { CharacterClass, Position, Team, HeroType, Target } from '../types';
import type { Action, ActionCondition, BattleState } from '../types';

// 테스트용 전진 액션
const advanceAction: Action = {
  id: 'test_advance',
  name: 'Advance',
  description: 'Move to front row.',
  effects: [{ type: 'MOVE', target: Target.SELF, position: 'FRONT' }],
};
const advanceCondition: ActionCondition = { type: 'POSITION_BACK' };

describe('영웅 액션 카드 편집 (공통 능력)', () => {
  let state: BattleState;

  beforeEach(() => {
    resetUnitCounter();

    const warrior = createUnit(createCharacterDef('Aldric', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const archer = createUnit(createCharacterDef('Sylva', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const enemy = createUnit(createCharacterDef('Shade', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);

    state = createBattleState([warrior, archer], [enemy]);
    // 개입 가능하도록 라운드 설정
    state = { ...state, round: 1, turn: 1 };
  });

  it('아군 유닛의 액션 슬롯을 교체할 수 있다', () => {
    const targetId = state.units.find((u) => u.name === 'Aldric')!.id;
    const { state: newState, events } = heroEditAction(state, targetId, 2, advanceAction, advanceCondition);

    const unit = newState.units.find((u) => u.id === targetId)!;
    expect(unit.actionSlots[2].action.id).toBe('test_advance');
    expect(unit.actionSlots[2].condition.type).toBe('POSITION_BACK');
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('ACTION_EDITED');
  });

  it('개입 1회를 소모한다', () => {
    const targetId = state.units.find((u) => u.name === 'Aldric')!.id;
    const { state: newState } = heroEditAction(state, targetId, 2, advanceAction, advanceCondition);

    expect(newState.hero.interventionsRemaining).toBe(state.hero.interventionsRemaining - 1);
  });

  it('개입 횟수가 0이면 편집 불가', () => {
    state = {
      ...state,
      hero: { ...state.hero, interventionsRemaining: 0 },
    };
    const targetId = state.units.find((u) => u.name === 'Aldric')!.id;
    const { state: newState, events } = heroEditAction(state, targetId, 2, advanceAction, advanceCondition);

    expect(events).toHaveLength(0);
    expect(newState).toBe(state);
  });

  it('적군 유닛은 편집 불가', () => {
    const enemyId = state.units.find((u) => u.team === Team.ENEMY)!.id;
    const { state: newState, events } = heroEditAction(state, enemyId, 0, advanceAction, advanceCondition);

    expect(events).toHaveLength(0);
    expect(newState).toBe(state);
  });

  it('잘못된 슬롯 인덱스는 편집 불가', () => {
    const targetId = state.units.find((u) => u.name === 'Aldric')!.id;
    const { state: newState, events } = heroEditAction(state, targetId, 5, advanceAction, advanceCondition);

    expect(events).toHaveLength(0);
    expect(newState).toBe(state);
  });

  it('사망한 유닛은 편집 불가', () => {
    state = {
      ...state,
      units: state.units.map((u) => (u.name === 'Aldric' ? { ...u, isAlive: false } : u)),
    };
    const targetId = state.units.find((u) => u.name === 'Aldric')!.id;
    const { state: newState, events } = heroEditAction(state, targetId, 0, advanceAction, advanceCondition);

    expect(events).toHaveLength(0);
    expect(newState).toBe(state);
  });
});

describe('전투 시작 시 actionSlots 스냅샷', () => {
  beforeEach(() => resetUnitCounter());

  it('createBattleState가 preBattleActionSlots를 저장한다', () => {
    const warrior = createUnit(createCharacterDef('Aldric', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Shade', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);

    const state = createBattleState([warrior], [enemy]);
    const unit = state.units.find((u) => u.name === 'Aldric')!;

    expect(unit.preBattleActionSlots).toBeDefined();
    expect(unit.preBattleActionSlots).toHaveLength(3);
    expect(unit.preBattleActionSlots![0].action.id).toBe(unit.actionSlots[0].action.id);
  });

  it('heroType을 지정할 수 있다', () => {
    const warrior = createUnit(createCharacterDef('Aldric', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Shade', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);

    const state = createBattleState([warrior], [enemy], undefined, HeroType.MAGE);
    expect(state.hero.heroType).toBe(HeroType.MAGE);
  });

  it('heroType 미지정 시 COMMANDER 기본값', () => {
    const warrior = createUnit(createCharacterDef('Aldric', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Shade', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);

    const state = createBattleState([warrior], [enemy]);
    expect(state.hero.heroType).toBe(HeroType.COMMANDER);
  });
});

describe('전투 종료 후 actionSlots 원복', () => {
  beforeEach(() => resetUnitCounter());

  it('전투 중 편집된 슬롯이 전투 시작 전 상태로 복원된다', () => {
    const warrior = createUnit(createCharacterDef('Aldric', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Shade', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);

    let state = createBattleState([warrior], [enemy]);
    state = { ...state, round: 1, turn: 1 };

    const originalActionId = state.units[0].actionSlots[2].action.id;

    // 영웅이 슬롯 2를 편집
    const { state: editedState } = heroEditAction(state, state.units[0].id, 2, advanceAction, advanceCondition);

    // 편집 확인
    expect(editedState.units[0].actionSlots[2].action.id).toBe('test_advance');

    // 전투 종료 후 원복
    const restored = restorePreBattleActions(editedState);
    expect(restored.units[0].actionSlots[2].action.id).toBe(originalActionId);
    expect(restored.units[0].preBattleActionSlots).toBeUndefined();
  });

  it('편집하지 않은 유닛도 원복 후 preBattleActionSlots가 제거된다', () => {
    const warrior = createUnit(createCharacterDef('Aldric', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Shade', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);

    const state = createBattleState([warrior], [enemy]);
    const restored = restorePreBattleActions(state);

    for (const unit of restored.units) {
      expect(unit.preBattleActionSlots).toBeUndefined();
    }
  });

  it('resetBattleActions: preBattleActionSlots가 없으면 변경 없음', () => {
    const warrior = createUnit(createCharacterDef('Aldric', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

    const result = resetBattleActions(warrior);
    expect(result).toBe(warrior);
  });
});
