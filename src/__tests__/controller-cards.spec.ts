import { describe, it, expect } from 'vitest';
import { Position, Team, Target, CharacterClass, Rarity, TargetSelect } from '../types';
import type { BattleUnit, BattleState, ActionSlot, ActionEffect } from '../types';
import { selectTarget } from '../systems/TargetSelector';
import { swapPositions } from '../systems/PositionSystem';
import { executeAction } from '../systems/ActionResolver';
import { generateCardVariant } from '../systems/ActionCardSystem';
import { CLASS_DEFINITIONS } from '../data/ClassDefinitions';
import { resetUnitCounter } from '../entities/UnitFactory';

// 테스트용 유닛 헬퍼
function makeUnit(overrides: Partial<BattleUnit> & { id: string }): BattleUnit {
  return {
    definitionId: overrides.id,
    name: overrides.id,
    characterClass: CharacterClass.WARRIOR,
    team: Team.PLAYER,
    position: Position.FRONT,
    stats: { hp: 50, maxHp: 50, atk: 10, grd: 5, agi: 8 },
    shield: 0,
    buffs: [],
    actionSlots: [],
    baseActionSlots: [],
    isAlive: true,
    hasActedThisRound: false,
    trainingsUsed: 0,
    trainingPotential: 3,
    ...overrides,
  };
}

function makeState(units: BattleUnit[]): BattleState {
  return {
    units,
    reserve: [],
    hero: {
      heroType: 'COMMANDER',
      interventionsRemaining: 1,
      maxInterventionsPerRound: 1,
      abilities: [],
    },
    round: 1,
    turn: 1,
    turnOrder: units.map((u) => u.id),
    phase: 'ACTION_RESOLVE',
    events: [],
    delayedEffects: [],
    isFinished: false,
    winner: null,
    seed: 42,
  };
}

describe('HIGHEST_ATK 타겟 셀렉터', () => {
  it('ENEMY_BACK 중 ATK가 가장 높은 유닛 선택', () => {
    const source = makeUnit({ id: 'src', team: Team.PLAYER });
    const e1 = makeUnit({
      id: 'e1',
      team: Team.ENEMY,
      position: Position.BACK,
      stats: { hp: 30, maxHp: 30, atk: 8, grd: 3, agi: 5 },
    });
    const e2 = makeUnit({
      id: 'e2',
      team: Team.ENEMY,
      position: Position.BACK,
      stats: { hp: 30, maxHp: 30, atk: 15, grd: 3, agi: 5 },
    });
    const e3 = makeUnit({
      id: 'e3',
      team: Team.ENEMY,
      position: Position.FRONT,
      stats: { hp: 40, maxHp: 40, atk: 20, grd: 5, agi: 7 },
    });

    const result = selectTarget(source, Target.ENEMY_BACK_HIGHEST_ATK, [source, e1, e2, e3]);
    expect(result?.id).toBe('e2'); // 후열 중 ATK 최고
  });

  it('후열 적이 없으면 전열로 폴백', () => {
    const source = makeUnit({ id: 'src', team: Team.PLAYER });
    const e1 = makeUnit({
      id: 'e1',
      team: Team.ENEMY,
      position: Position.FRONT,
      stats: { hp: 40, maxHp: 40, atk: 12, grd: 5, agi: 7 },
    });
    const e2 = makeUnit({
      id: 'e2',
      team: Team.ENEMY,
      position: Position.FRONT,
      stats: { hp: 40, maxHp: 40, atk: 18, grd: 5, agi: 7 },
    });

    const result = selectTarget(source, Target.ENEMY_BACK_HIGHEST_ATK, [source, e1, e2]);
    expect(result?.id).toBe('e2'); // 폴백 → 전열 중 ATK 최고
  });
});

describe('ENEMY_BACK_LOWEST_HP 타겟 셀렉터', () => {
  it('ENEMY_BACK 중 HP가 가장 낮은 유닛 선택', () => {
    const source = makeUnit({ id: 'src', team: Team.PLAYER });
    const e1 = makeUnit({
      id: 'e1',
      team: Team.ENEMY,
      position: Position.BACK,
      stats: { hp: 25, maxHp: 30, atk: 8, grd: 3, agi: 5 },
    });
    const e2 = makeUnit({
      id: 'e2',
      team: Team.ENEMY,
      position: Position.BACK,
      stats: { hp: 10, maxHp: 30, atk: 12, grd: 3, agi: 5 },
    });
    const e3 = makeUnit({
      id: 'e3',
      team: Team.ENEMY,
      position: Position.FRONT,
      stats: { hp: 5, maxHp: 40, atk: 10, grd: 5, agi: 7 },
    });

    const result = selectTarget(source, Target.ENEMY_BACK_LOWEST_HP, [source, e1, e2, e3]);
    expect(result?.id).toBe('e2'); // 후열 중 HP 최저
  });
});

describe('swapPositions', () => {
  it('FRONT ↔ BACK 교환', () => {
    const a = makeUnit({ id: 'a', position: Position.FRONT });
    const b = makeUnit({ id: 'b', position: Position.BACK });

    const result = swapPositions(a, b, 'controller', 1, 1);
    expect(result.unitA.position).toBe(Position.BACK);
    expect(result.unitB.position).toBe(Position.FRONT);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('UNIT_SWAPPED');
    expect(result.events[0].data).toMatchObject({
      unitAId: 'a',
      unitBId: 'b',
      unitAFrom: Position.FRONT,
      unitATo: Position.BACK,
      unitBFrom: Position.BACK,
      unitBTo: Position.FRONT,
    });
  });

  it('같은 포지션이면 no-op', () => {
    const a = makeUnit({ id: 'a', position: Position.FRONT });
    const b = makeUnit({ id: 'b', position: Position.FRONT });

    const result = swapPositions(a, b, 'controller', 1, 1);
    expect(result.events).toHaveLength(0);
    expect(result.unitA.position).toBe(Position.FRONT);
    expect(result.unitB.position).toBe(Position.FRONT);
  });
});

describe('SWAP 효과 — ActionResolver 통합', () => {
  it('SWAP 액션이 적 후열↔전열 교환', () => {
    const controller = makeUnit({
      id: 'ctrl',
      team: Team.PLAYER,
      characterClass: CharacterClass.CONTROLLER,
      position: Position.FRONT,
    });
    const eFront = makeUnit({ id: 'ef', team: Team.ENEMY, position: Position.FRONT });
    const eBack = makeUnit({ id: 'eb', team: Team.ENEMY, position: Position.BACK });

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'test_swap',
        name: 'Test Swap',
        description: 'Swap test',
        effects: [
          {
            type: 'SWAP',
            target: Target.ENEMY_BACK,
            swapTarget: Target.ENEMY_FRONT,
          },
        ],
      },
    };

    const state = makeState([controller, eFront, eBack]);
    const result = executeAction(controller, slot, state);

    const swapped = result.units;
    expect(swapped.find((u) => u.id === 'ef')!.position).toBe(Position.BACK);
    expect(swapped.find((u) => u.id === 'eb')!.position).toBe(Position.FRONT);
    expect(result.events.some((e) => e.type === 'UNIT_SWAPPED')).toBe(true);
  });

  it('SWAP 파트너가 없으면 no-op', () => {
    const controller = makeUnit({ id: 'ctrl', team: Team.PLAYER });
    // 적이 전부 후열 — swapTarget(ENEMY_FRONT)가 없음
    const eBack1 = makeUnit({ id: 'eb1', team: Team.ENEMY, position: Position.BACK });
    const eBack2 = makeUnit({ id: 'eb2', team: Team.ENEMY, position: Position.BACK });

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'test_swap',
        name: 'Test Swap',
        description: 'Swap test',
        effects: [
          {
            type: 'SWAP',
            target: Target.ENEMY_BACK,
            swapTarget: Target.ENEMY_FRONT,
          },
        ],
      },
    };

    const state = makeState([controller, eBack1, eBack2]);
    const result = executeAction(controller, slot, state);

    // ENEMY_FRONT 없으므로 폴백으로 BACK에서 선택 → 같은 유닛이거나 같은 포지션 → no-op
    expect(result.events.filter((e) => e.type === 'UNIT_SWAPPED')).toHaveLength(0);
  });

  it('Break Formation — ENEMY_BACK 중 ATK 최고를 SWAP', () => {
    const controller = makeUnit({ id: 'ctrl', team: Team.PLAYER });
    const eFront = makeUnit({
      id: 'ef',
      team: Team.ENEMY,
      position: Position.FRONT,
      stats: { hp: 50, maxHp: 50, atk: 8, grd: 5, agi: 8 },
    });
    const eBack1 = makeUnit({
      id: 'eb1',
      team: Team.ENEMY,
      position: Position.BACK,
      stats: { hp: 30, maxHp: 30, atk: 14, grd: 3, agi: 6 },
    });
    const eBack2 = makeUnit({
      id: 'eb2',
      team: Team.ENEMY,
      position: Position.BACK,
      stats: { hp: 30, maxHp: 30, atk: 9, grd: 3, agi: 7 },
    });

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'break_formation',
        name: 'Break Formation',
        description: 'Swap highest ATK back enemy with front',
        effects: [
          {
            type: 'SWAP',
            target: Target.ENEMY_BACK_HIGHEST_ATK,
            swapTarget: Target.ENEMY_FRONT,
          },
        ],
      },
    };

    const state = makeState([controller, eFront, eBack1, eBack2]);
    const result = executeAction(controller, slot, state);

    // eb1(ATK 14)이 전열로, ef가 후열로
    expect(result.units.find((u) => u.id === 'eb1')!.position).toBe(Position.FRONT);
    expect(result.units.find((u) => u.id === 'ef')!.position).toBe(Position.BACK);
    expect(result.units.find((u) => u.id === 'eb2')!.position).toBe(Position.BACK); // 변경 없음
  });
});

describe('Controller cardTemplates', () => {
  const controllerDef = CLASS_DEFINITIONS[CharacterClass.CONTROLLER];

  it('카드 템플릿 10장 (기본 4 + 특수 6)', () => {
    expect(controllerDef.cardTemplates).toHaveLength(10);
  });

  it('특수 카드 ID 확인', () => {
    const ids = controllerDef.cardTemplates.map((t) => t.id);
    expect(ids).toContain('controller_gravity_pull');
    expect(ids).toContain('controller_expose_weakness');
    expect(ids).toContain('controller_displace');
    expect(ids).toContain('controller_break_formation');
    expect(ids).toContain('controller_disrupt');
    expect(ids).toContain('controller_mind_jolt');
  });

  it('Gravity Pull — 순수 PULL (DELAY 없음)', () => {
    const gp = controllerDef.cardTemplates.find((t) => t.id === 'controller_gravity_pull')!;
    expect(gp.rarity).toBe(Rarity.RARE);
    expect(gp.effectTemplates).toHaveLength(1);
    expect(gp.effectTemplates[0].type).toBe('PUSH');
    expect(gp.effectTemplates[0].position).toBe('FRONT');
  });

  it('Expose Weakness — ENEMY_BACK_LOWEST_HP 타겟', () => {
    const ew = controllerDef.cardTemplates.find((t) => t.id === 'controller_expose_weakness')!;
    expect(ew.rarity).toBe(Rarity.RARE);
    expect(ew.effectTemplates[0].targetPool).toEqual([Target.ENEMY_BACK_LOWEST_HP]);
  });

  it('Displace — SWAP COMMON', () => {
    const d = controllerDef.cardTemplates.find((t) => t.id === 'controller_displace')!;
    expect(d.rarity).toBe(Rarity.COMMON);
    expect(d.effectTemplates[0].type).toBe('SWAP');
    expect(d.effectTemplates[0].swapTarget).toEqual(Target.ENEMY_FRONT);
  });

  it('Break Formation — SWAP RARE + HIGHEST_ATK', () => {
    const bf = controllerDef.cardTemplates.find((t) => t.id === 'controller_break_formation')!;
    expect(bf.rarity).toBe(Rarity.RARE);
    expect(bf.effectTemplates[0].targetPool).toEqual([Target.ENEMY_BACK_HIGHEST_ATK]);
  });

  it('Disrupt — POSITION_FRONT 조건, DAMAGE + DELAY', () => {
    const d = controllerDef.cardTemplates.find((t) => t.id === 'controller_disrupt')!;
    expect(d.rarity).toBe(Rarity.COMMON);
    expect(d.condition.type).toBe('POSITION_FRONT');
    expect(d.effectTemplates).toHaveLength(2);
    expect(d.effectTemplates[0].type).toBe('DAMAGE');
    expect(d.effectTemplates[1].type).toBe('DELAY_TURN');
  });

  it('Mind Jolt — ALWAYS 조건, RARE', () => {
    const mj = controllerDef.cardTemplates.find((t) => t.id === 'controller_mind_jolt')!;
    expect(mj.rarity).toBe(Rarity.RARE);
    expect(mj.condition.type).toBe('ALWAYS');
  });

  it('generateCardVariant로 Displace 카드 생성 — swapTarget 포함', () => {
    const template = controllerDef.cardTemplates.find((t) => t.id === 'controller_displace')!;
    const card = generateCardVariant(template, 123);
    expect(card.effects[0].type).toBe('SWAP');
    expect(card.effects[0].swapTarget).toEqual(Target.ENEMY_FRONT);
    expect(card.description).toContain('Swap');
  });
});
