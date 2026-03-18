import { describe, it, expect, beforeEach } from 'vitest';
import { executeAction } from '../systems/ActionResolver';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, Target } from '../types';
import type { BattleState, ActionSlot } from '../types';

function makeBattleState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    units: [],
    reserve: [],
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

describe('Charge 복합 효과', () => {
  beforeEach(() => resetUnitCounter());

  it('Lancer Charge: 데미지 + 적 밀기가 순서대로 실행된다', () => {
    const lancer = createUnit(createCharacterDef('Lancer', CharacterClass.LANCER), Team.PLAYER, Position.BACK);
    const enemy = createUnit(createCharacterDef('Enemy', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    // Lancer의 기본 액션은 Charge (DAMAGE 1.4 + PUSH BACK)
    // 여기에 MOVE FRONT를 앞에 추가하여 full charge 시뮬레이션
    const fullChargeSlot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'full_charge',
        name: 'Full Charge',
        description: 'Move to front, deal damage, push enemy back',
        effects: [
          { type: 'MOVE', target: Target.SELF, position: 'FRONT' },
          { type: 'DAMAGE', value: 1.4, stat: 'atk', target: Target.ENEMY_FRONT },
          { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
        ],
      },
    };

    const state = makeBattleState({ units: [lancer, enemy] });

    const result = executeAction(lancer, fullChargeSlot, state);

    // 1. Lancer가 FRONT로 이동했는지 확인
    const updatedLancer = result.units.find(u => u.id === lancer.id)!;
    expect(updatedLancer.position).toBe(Position.FRONT);

    // 2. 적에게 데미지가 적용되었는지 확인
    const updatedEnemy = result.units.find(u => u.id === enemy.id)!;
    expect(updatedEnemy.stats.hp).toBeLessThan(enemy.stats.hp);

    // 3. 적이 BACK으로 밀렸는지 확인
    expect(updatedEnemy.position).toBe(Position.BACK);

    // 4. 이벤트 순서 확인: ACTION_EXECUTED → UNIT_MOVED → DAMAGE_DEALT → UNIT_PUSHED
    const eventTypes = result.events.map(e => e.type);
    expect(eventTypes[0]).toBe('ACTION_EXECUTED');
    expect(eventTypes[1]).toBe('UNIT_MOVED');
    expect(eventTypes[2]).toBe('DAMAGE_DEALT');
    expect(eventTypes[3]).toBe('UNIT_PUSHED');
  });

  it('차지: 전열에 적이 여럿일 때 DAMAGE와 PUSH는 같은 적(AGI 가장 높은 전열 적)을 타겟한다', () => {
    // 복합 효과 내 타겟 선정 규칙:
    // 각 효과는 독립적으로 selectTarget을 호출하지만,
    // 같은 조건(ENEMY_FRONT = AGI 기준)이므로 생존 중인 한 동일 유닛이 선택된다.
    const lancer = createUnit(createCharacterDef('Lancer', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);
    // 전열 적 2명: Lancer(AGI:12)가 Warrior(AGI:8)보다 먼저 타겟
    const eFront1 = createUnit(createCharacterDef('E-Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const eFront2 = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    // eFront2(Lancer, AGI:12)가 AGI 높아 ENEMY_FRONT 타겟으로 우선 선택됨

    const chargeSlot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'charge',
        name: 'Charge',
        description: '',
        effects: [
          { type: 'DAMAGE', value: 1.4, target: Target.ENEMY_FRONT },
          { type: 'PUSH', target: Target.ENEMY_FRONT, position: 'BACK' },
        ],
      },
    };

    const state = makeBattleState({ units: [lancer, eFront1, eFront2] });
    const result = executeAction(lancer, chargeSlot, state);

    const updatedFront1 = result.units.find(u => u.id === eFront1.id)!;
    const updatedFront2 = result.units.find(u => u.id === eFront2.id)!;

    // DAMAGE는 AGI 높은 eFront2에게 적용됨
    expect(updatedFront2.stats.hp).toBeLessThan(eFront2.stats.hp);
    expect(updatedFront1.stats.hp).toBe(eFront1.stats.hp); // eFront1은 피해 없음

    // PUSH도 같은 eFront2에게 적용됨 (AGI 기준 재선택 → 동일 유닛)
    expect(updatedFront2.position).toBe(Position.BACK);
    expect(updatedFront1.position).toBe(Position.FRONT); // eFront1은 밀리지 않음
  });

  it('Lancer 기본 Charge: ClassDefinitions의 기본 액션으로 동작한다', () => {
    const lancer = createUnit(createCharacterDef('Lancer', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Enemy', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    // 기본 액션 슬롯 사용 (ALWAYS → lancer_charge: DAMAGE 1.4 + PUSH BACK)
    const basicSlot = lancer.actionSlots[0]; // ALWAYS → Charge

    const state = makeBattleState({ units: [lancer, enemy] });

    const result = executeAction(lancer, basicSlot, state);

    // 적에게 데미지 적용
    const updatedEnemy = result.units.find(u => u.id === enemy.id)!;
    expect(updatedEnemy.stats.hp).toBeLessThan(enemy.stats.hp);

    // 적이 BACK으로 밀림
    expect(updatedEnemy.position).toBe(Position.BACK);

    // 이벤트에 DAMAGE_DEALT과 UNIT_PUSHED 포함
    const eventTypes = result.events.map(e => e.type);
    expect(eventTypes).toContain('DAMAGE_DEALT');
    expect(eventTypes).toContain('UNIT_PUSHED');
  });
});
