import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateCondition, selectAction } from '../systems/ActionResolver';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase } from '../types';
import type { BattleState, ActionSlot } from '../types';

function makeBattleState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    units: [],
    reserve: [],
    hero: { interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
    round: 1,
    turn: 1,
    turnOrder: [],
    phase: BattlePhase.ACTION_RESOLVE,
    events: [],
    isFinished: false,
    winner: null,
    seed: 12345,
    ...overrides,
  };
}

describe('액션 해석 시스템', () => {
  beforeEach(() => resetUnitCounter());

  it('조건이 맞는 첫 번째 액션을 선택한다 (우선순위)', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    // 액션 슬롯: FRONT → Attack, BACK → Defend, ALWAYS → BasicAction
    const frontAttack: ActionSlot = {
      condition: { type: 'POSITION_FRONT' },
      action: { id: 'atk', name: 'Attack', description: '', effects: [{ type: 'DAMAGE', value: 1.0, target: 'ENEMY_FRONT' }] },
    };
    const backDefend: ActionSlot = {
      condition: { type: 'POSITION_BACK' },
      action: { id: 'def', name: 'Defend', description: '', effects: [{ type: 'SHIELD', value: 10, target: 'SELF' }] },
    };

    unit.actionSlots = [frontAttack, backDefend, ...unit.actionSlots]; // 기본 액션은 마지막

    const state = makeBattleState({ units: [unit, enemy] });
    const selected = selectAction(unit, state);

    // 유닛이 FRONT에 있으므로 첫 번째 액션 선택
    expect(selected).not.toBeNull();
    expect(selected!.action.id).toBe('atk');
  });

  it('첫 번째 조건이 안 맞으면 다음 액션을 평가한다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.BACK); // BACK 위치
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const frontOnly: ActionSlot = {
      condition: { type: 'POSITION_FRONT' },
      action: { id: 'front_atk', name: 'FrontAttack', description: '', effects: [] },
    };
    const backOnly: ActionSlot = {
      condition: { type: 'POSITION_BACK' },
      action: { id: 'back_move', name: 'MoveForward', description: '', effects: [{ type: 'MOVE', position: 'FRONT' }] },
    };

    unit.actionSlots = [frontOnly, backOnly, ...unit.actionSlots];

    const state = makeBattleState({ units: [unit, enemy] });
    const selected = selectAction(unit, state);

    // BACK 위치이므로 두 번째 액션 선택
    expect(selected!.action.id).toBe('back_move');
  });

  it('모든 조건이 안 맞으면 턴이 손실된다 (null 반환)', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

    // 기본 액션 제거, 맞지 않는 조건만 남김
    unit.actionSlots = [
      { condition: { type: 'HP_BELOW', value: 10 }, action: { id: 'heal', name: 'Heal', description: '', effects: [] } },
      { condition: { type: 'POSITION_BACK' }, action: { id: 'x', name: 'X', description: '', effects: [] } },
    ];

    const state = makeBattleState({ units: [unit] });
    const selected = selectAction(unit, state);

    // FRONT에 있고 HP가 충분하므로 모든 조건 불일치 → null
    expect(selected).toBeNull();
  });

  it('HP_BELOW 조건: HP 비율이 임계값 미만일 때 발동', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    // HP를 25%로 설정 (110 → 27)
    unit.stats.hp = 27;

    const healSlot: ActionSlot = {
      condition: { type: 'HP_BELOW', value: 30 }, // 30% 미만
      action: { id: 'heal', name: 'Heal', description: '', effects: [] },
    };

    const state = makeBattleState({ units: [unit] });
    const result = evaluateCondition(healSlot, unit, state);

    expect(result).toBe(true);
  });

  it('ENEMY_FRONT_EXISTS: 적 전열에 유닛이 있을 때 발동', () => {
    const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemyFront = createUnit(createCharacterDef('EF', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ENEMY_FRONT_EXISTS' },
      action: { id: 'x', name: 'X', description: '', effects: [] },
    };

    const state = makeBattleState({ units: [player, enemyFront] });
    expect(evaluateCondition(slot, player, state)).toBe(true);

    // 적이 BACK에만 있으면 false
    enemyFront.position = Position.BACK;
    expect(evaluateCondition(slot, player, state)).toBe(false);
  });

  it('LOWEST_HP_ENEMY: 항상 true (타겟팅 힌트)', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'LOWEST_HP_ENEMY' },
      action: { id: 'x', name: 'X', description: '', effects: [] },
    };

    const state = makeBattleState({ units: [unit, enemy] });
    expect(evaluateCondition(slot, unit, state)).toBe(true);
  });

  it('FIRST_ACTION_THIS_ROUND: turn === 1일 때 true', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'FIRST_ACTION_THIS_ROUND' },
      action: { id: 'x', name: 'X', description: '', effects: [] },
    };

    // turn 1이면 true
    const state1 = makeBattleState({ units: [unit], turn: 1 });
    expect(evaluateCondition(slot, unit, state1)).toBe(true);

    // turn 2이면 false
    const state2 = makeBattleState({ units: [unit], turn: 2 });
    expect(evaluateCondition(slot, unit, state2)).toBe(false);
  });

  it('HAS_HERO_BUFF: shield > 0일 때 true', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'HAS_HERO_BUFF' },
      action: { id: 'x', name: 'X', description: '', effects: [] },
    };

    // shield가 0이면 false
    const state = makeBattleState({ units: [unit] });
    expect(evaluateCondition(slot, unit, state)).toBe(false);

    // shield > 0이면 true
    unit.shield = 15;
    expect(evaluateCondition(slot, unit, state)).toBe(true);
  });
});
