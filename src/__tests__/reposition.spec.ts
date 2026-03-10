import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase } from '../types';
import type { BattleState, ActionSlot } from '../types';
import { resetUid } from '../utils/uid';
import { executeAction } from '../systems/ActionResolver';

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

describe('Reposition 효과', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('아군을 BACK에서 FRONT로 이동시킨다', () => {
    const source = createUnit(createCharacterDef('S', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const ally = createUnit(createCharacterDef('A', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'reposition',
        name: 'Reposition',
        description: '',
        effects: [{ type: 'REPOSITION', target: 'ALLY_ANY', position: Position.FRONT }],
      },
    };

    const state = makeBattleState({ units: [source, ally, enemy] });
    const result = executeAction(source, slot, state);

    const movedAlly = result.units.find(u => u.id === ally.id);
    expect(movedAlly!.position).toBe(Position.FRONT);
  });

  it('아군을 FRONT에서 BACK으로 이동시킨다', () => {
    const source = createUnit(createCharacterDef('S', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'reposition',
        name: 'Reposition',
        description: '',
        effects: [{ type: 'REPOSITION', target: 'ALLY_ANY', position: Position.BACK }],
      },
    };

    const state = makeBattleState({ units: [source, ally, enemy] });
    const result = executeAction(source, slot, state);

    const movedAlly = result.units.find(u => u.id === ally.id);
    expect(movedAlly!.position).toBe(Position.BACK);
  });

  it('이미 같은 포지션이면 이동하지 않는다', () => {
    const source = createUnit(createCharacterDef('S', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'reposition',
        name: 'Reposition',
        description: '',
        effects: [{ type: 'REPOSITION', target: 'ALLY_ANY', position: Position.FRONT }],
      },
    };

    const state = makeBattleState({ units: [source, ally, enemy] });
    const result = executeAction(source, slot, state);

    // UNIT_MOVED 이벤트가 없어야 함 (이미 같은 위치)
    const moveEvents = result.events.filter(e => e.type === 'UNIT_MOVED');
    expect(moveEvents).toHaveLength(0);
  });

  it('REPOSITION은 UNIT_MOVED 이벤트를 생성한다', () => {
    const source = createUnit(createCharacterDef('S', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const ally = createUnit(createCharacterDef('A', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'reposition',
        name: 'Reposition',
        description: '',
        effects: [{ type: 'REPOSITION', target: 'ALLY_ANY', position: Position.FRONT }],
      },
    };

    const state = makeBattleState({ units: [source, ally, enemy] });
    const result = executeAction(source, slot, state);

    const moveEvents = result.events.filter(e => e.type === 'UNIT_MOVED');
    expect(moveEvents).toHaveLength(1);
    expect(moveEvents[0].targetId).toBe(ally.id);
  });

  it('HP가 가장 낮은 아군을 BACK으로 이동시킨다 (ALLY_LOWEST_HP)', () => {
    const source = createUnit(createCharacterDef('S', CharacterClass.CONTROLLER), Team.PLAYER, Position.BACK);
    const ally1 = createUnit(createCharacterDef('A1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const ally2 = createUnit(createCharacterDef('A2', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    ally1.stats.hp = 20; // 더 낮은 HP
    ally2.stats.hp = 80;
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'reposition',
        name: 'Protect Weak',
        description: '',
        effects: [{ type: 'REPOSITION', target: 'ALLY_LOWEST_HP', position: Position.BACK }],
      },
    };

    const state = makeBattleState({ units: [source, ally1, ally2, enemy] });
    const result = executeAction(source, slot, state);

    // HP가 가장 낮은 ally1이 BACK으로 이동
    const movedAlly = result.units.find(u => u.id === ally1.id);
    expect(movedAlly!.position).toBe(Position.BACK);
  });
});
