import { describe, it, expect, beforeEach } from 'vitest';
import { evaluateCondition, selectAction } from '../systems/ActionResolver';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, Target } from '../types';
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
    delayedEffects: [],
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
      action: { id: 'atk', name: 'Attack', description: '', effects: [{ type: 'DAMAGE', value: 1.0, target: Target.ENEMY_FRONT }] },
    };
    const backDefend: ActionSlot = {
      condition: { type: 'POSITION_BACK' },
      action: { id: 'defend', name: 'Defend', description: '', effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF }] },
    };

    unit.actionSlots = [frontAttack, backDefend, ...unit.actionSlots]; // 기본 액션은 마지막

    const state = makeBattleState({ units: [unit, enemy] });
    const selected = selectAction(unit, state);

    // 유닛이 FRONT에 있으므로 첫 번째 액션 선택
    expect(selected).not.toBeNull();
    expect(selected).not.toBe('STUNNED');
    expect((selected as ActionSlot).action.id).toBe('atk');
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
    expect(selected).not.toBe('STUNNED');
    expect((selected as ActionSlot).action.id).toBe('back_move');
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
    // HP를 25%로 설정 (maxHp 53 → 13)
    unit.stats.hp = 13;

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

  it('FIRST_ACTION_THIS_ROUND: 해당 라운드의 첫 번째 행동(turn=1)일 때만 true', () => {
    // state.turn은 라운드별 카운터 (startRound에서 0으로 리셋).
    // turn=1 = 이번 라운드 첫 번째 행동 유닛, turn=2 = 두 번째 행동 유닛.
    // Guardian의 Fortify처럼 "라운드 첫 행동 유닛에게만 발동"하는 조건에 사용.
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'FIRST_ACTION_THIS_ROUND' },
      action: { id: 'x', name: 'X', description: '', effects: [] },
    };

    // 라운드 내 첫 번째 행동(turn=1)이면 true
    const stateFirst = makeBattleState({ units: [unit], turn: 1 });
    expect(evaluateCondition(slot, unit, stateFirst)).toBe(true);

    // 같은 라운드의 두 번째 행동(turn=2)이면 false
    const stateSecond = makeBattleState({ units: [unit], turn: 2 });
    expect(evaluateCondition(slot, unit, stateSecond)).toBe(false);

    // 라운드가 달라도 turn=1이면 항상 true (turn은 라운드마다 리셋됨)
    const stateRound2First = makeBattleState({ units: [unit], turn: 1, round: 2 });
    expect(evaluateCondition(slot, unit, stateRound2First)).toBe(true);
  });

  it('ENEMY_HP_BELOW: 적 중 HP가 N% 미만인 유닛이 있을 때 발동', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ENEMY_HP_BELOW', value: 30 },
      action: { id: 'execute', name: 'Execute', description: '', effects: [] },
    };

    // 적 HP 100% → false
    const state = makeBattleState({ units: [unit, enemy] });
    expect(evaluateCondition(slot, unit, state)).toBe(false);

    // 적 HP를 25%로 설정 → true
    enemy.stats.hp = Math.floor(enemy.stats.maxHp * 0.25);
    expect(evaluateCondition(slot, unit, state)).toBe(true);

    // 적 HP를 35%로 설정 → false (30% 미만이 아님)
    enemy.stats.hp = Math.floor(enemy.stats.maxHp * 0.35);
    expect(evaluateCondition(slot, unit, state)).toBe(false);
  });

  it('HAS_HERO_BUFF: 유닛에게 실드가 있으면 true (MVP: 히어로 실드 = hero buff)', () => {
    // MVP에서 히어로가 부여할 수 있는 버프는 실드(SHIELD)이므로
    // HAS_HERO_BUFF는 unit.shield > 0으로 검사한다.
    // 추후 히어로 버프 종류가 늘어나면 별도 상태 필드가 필요할 수 있음.
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'HAS_HERO_BUFF' },
      action: { id: 'x', name: 'X', description: '', effects: [] },
    };

    // 실드가 없으면 false
    const state = makeBattleState({ units: [unit] });
    expect(evaluateCondition(slot, unit, state)).toBe(false);

    // 실드가 있으면 true
    unit.shield = 15;
    expect(evaluateCondition(slot, unit, state)).toBe(true);
  });
});
