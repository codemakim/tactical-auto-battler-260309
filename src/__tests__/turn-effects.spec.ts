import { describe, it, expect, beforeEach } from 'vitest';
import { executeAction } from '../systems/ActionResolver';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, Target } from '../types';
import type { BattleState, ActionSlot } from '../types';

function makeBattleState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    units: [],
    hero: { heroType: 'COMMANDER', interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
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

describe('턴 순서 변경 효과', () => {
  beforeEach(() => resetUnitCounter());

  it('DELAY_TURN: 적의 턴을 뒤로 미룬다', () => {
    const unit = createUnit(createCharacterDef('Controller', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const enemy1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const enemy2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.BACK);

    const turnOrder = [unit.id, enemy1.id, enemy2.id];

    const delaySlot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'delay_action',
        name: 'Delay',
        description: 'Delay enemy turn',
        effects: [{ type: 'DELAY_TURN', target: Target.ENEMY_FRONT }],
      },
    };

    const state = makeBattleState({
      units: [unit, enemy1, enemy2],
      turnOrder,
    });

    const result = executeAction(unit, delaySlot, state);

    // turnOrder should be modified: enemy1 delayed by 2 positions
    expect(result.turnOrder).toBeDefined();
    const e1Idx = result.turnOrder!.indexOf(enemy1.id);
    // enemy1 was at index 1, delayed by 2 → should be at index 2 (end)
    expect(e1Idx).toBeGreaterThan(1);
  });

  it('ADVANCE_TURN: 아군의 턴을 앞으로 당긴다', () => {
    const unit = createUnit(createCharacterDef('Controller', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const ally = createUnit(createCharacterDef('Ally', CharacterClass.WARRIOR), Team.PLAYER, Position.BACK);
    const enemy1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const enemy2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.BACK);

    // ally is last in turn order
    const turnOrder = [unit.id, enemy1.id, enemy2.id, ally.id];

    const advanceSlot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'advance_action',
        name: 'Advance',
        description: 'Advance ally turn',
        effects: [{ type: 'ADVANCE_TURN', target: Target.ALLY_LOWEST_HP }],
      },
    };

    // Lower ally HP so ALLY_LOWEST_HP selects them
    ally.stats.hp = 50;

    const state = makeBattleState({
      units: [unit, ally, enemy1, enemy2],
      turnOrder,
    });

    const result = executeAction(unit, advanceSlot, state);

    expect(result.turnOrder).toBeDefined();
    const allyIdx = result.turnOrder!.indexOf(ally.id);
    // ally was at index 3, accelerated by 2 → should be at index 1
    expect(allyIdx).toBeLessThan(3);
  });

  it('DELAY_TURN과 DAMAGE를 함께 사용할 수 있다', () => {
    const unit = createUnit(createCharacterDef('Controller', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.BACK);

    const turnOrder = [unit.id, enemy.id, ally.id];

    const comboSlot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'combo_action',
        name: 'Disrupt',
        description: 'Damage and delay',
        effects: [
          { type: 'DAMAGE', value: 0.8, target: Target.ENEMY_FRONT },
          { type: 'DELAY_TURN', target: Target.ENEMY_FRONT },
        ],
      },
    };

    const state = makeBattleState({
      units: [unit, enemy, ally],
      turnOrder,
    });

    const result = executeAction(unit, comboSlot, state);

    // Damage should be dealt
    const damagedEnemy = result.units.find((u) => u.id === enemy.id)!;
    expect(damagedEnemy.stats.hp).toBeLessThan(enemy.stats.hp);

    // Turn order should be modified
    expect(result.turnOrder).toBeDefined();
    const enemyIdx = result.turnOrder!.indexOf(enemy.id);
    expect(enemyIdx).toBeGreaterThan(1);
  });
});
