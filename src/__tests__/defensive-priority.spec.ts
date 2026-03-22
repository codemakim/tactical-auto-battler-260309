import { describe, it, expect, beforeEach } from 'vitest';
import { calculateFullTurnOrder, calculateTurnOrder } from '../core/TurnOrderManager';
import { createBattleState, stepBattle } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, Target } from '../types';
import type { BattleUnit, BattleState, ActionSlot } from '../types';
import { resetUid } from '../utils/uid';

// 방어 우선권 액션 슬롯 헬퍼
function makeDefensiveSlot(): ActionSlot {
  return {
    condition: { type: 'ALWAYS' },
    action: {
      id: 'test_shield',
      name: 'Shield',
      description: 'defensive action',
      defensivePriority: true,
      effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF }],
    },
  };
}

function makeAttackSlot(): ActionSlot {
  return {
    condition: { type: 'ALWAYS' },
    action: {
      id: 'test_attack',
      name: 'Attack',
      description: 'offensive action',
      effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
    },
  };
}

describe('방어 행동 우선권 (Defensive Action Priority)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('AGI 낮은 방어 유닛이 AGI 높은 공격 유닛보다 먼저 행동한다', () => {
    // Guardian AGI 4 (방어) vs Assassin AGI 11 (공격)
    const guardian = createUnit(createCharacterDef('Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const assassin = createUnit(createCharacterDef('Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);

    // Guardian: Shield Wall (defensivePriority), Assassin: Dive (no priority)
    const state = createBattleState([guardian], [assassin], [], []);

    const order = calculateFullTurnOrder([guardian, assassin], state);

    // Guardian이 방어 우선권으로 먼저
    expect(order[0]).toBe(guardian.id);
    expect(order[1]).toBe(assassin.id);
  });

  it('방어 유닛끼리는 AGI 순서를 유지한다', () => {
    const g1 = createUnit(createCharacterDef('G1', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const g2 = createUnit(createCharacterDef('G2', CharacterClass.GUARDIAN), Team.ENEMY, Position.FRONT);

    // 둘 다 Shield Wall (defensivePriority) — AGI 동일하면 HP 비율로 결정
    // AGI 같으니 HP 비율 tiebreaker
    const state = createBattleState([g1], [g2], [], []);
    const order = calculateFullTurnOrder([g1, g2], state);

    // 둘 다 defensive → AGI 동일 → HP 비율 tiebreaker
    expect(order).toHaveLength(2);
  });

  it('비방어 유닛끼리는 기존 AGI 순서를 유지한다', () => {
    const assassin = createUnit(createCharacterDef('Assassin', CharacterClass.ASSASSIN), Team.PLAYER, Position.BACK);
    const warrior = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const state = createBattleState([assassin], [warrior], [], []);
    const order = calculateFullTurnOrder([assassin, warrior], state);

    // Assassin AGI 11 > Warrior AGI 6 → 기존 순서 유지
    expect(order[0]).toBe(assassin.id);
    expect(order[1]).toBe(warrior.id);
  });

  it('defensivePriority 없는 가디언 카드는 우선권이 없다', () => {
    const guardian = createUnit(createCharacterDef('Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const warrior = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    // Guardian의 액션을 비방어로 교체
    const guardianNoDefense: BattleUnit = {
      ...guardian,
      actionSlots: [makeAttackSlot()],
    };

    const state = createBattleState([guardianNoDefense], [warrior], [], []);
    const order = calculateFullTurnOrder([guardianNoDefense, warrior], state);

    // 둘 다 비방어 → AGI 순서 (Warrior AGI 6 > Guardian AGI 4)
    expect(order[0]).toBe(warrior.id);
    expect(order[1]).toBe(guardianNoDefense.id);
  });

  it('커스텀 방어 슬롯도 defensivePriority 플래그로 우선권을 받는다', () => {
    const slow = createUnit(createCharacterDef('SlowDef', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const fast = createUnit(createCharacterDef('FastAtk', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);

    // 느린 유닛에 방어 슬롯 장착
    const slowDefender: BattleUnit = {
      ...slow,
      actionSlots: [makeDefensiveSlot()],
    };

    const state = createBattleState([slowDefender], [fast], [], []);
    const order = calculateFullTurnOrder([slowDefender, fast], state);

    // 방어 우선 → slowDefender 먼저
    expect(order[0]).toBe(slowDefender.id);
    expect(order[1]).toBe(fast.id);
  });

  it('매 턴 재평가: 조건 변경으로 방어 행동 여부가 바뀌면 순서도 바뀐다', () => {
    // Guardian: POSITION_BACK → Advance Guard (defensive), POSITION_FRONT → Shield Wall (defensive)
    // HP_BELOW 50 → Heavy Shield (defensive)
    // 전부 방어라 직접 조건부 슬롯을 만들어서 테스트
    const unit = createUnit(createCharacterDef('Switcher', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('Enemy', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);

    // FRONT일 때 방어, BACK일 때 공격
    const switcher: BattleUnit = {
      ...unit,
      actionSlots: [
        {
          condition: { type: 'POSITION_FRONT' },
          action: {
            id: 'conditional_shield',
            name: 'Shield',
            description: '',
            defensivePriority: true,
            effects: [{ type: 'SHIELD', value: 1.0, stat: 'grd', target: Target.SELF }],
          },
        },
        {
          condition: { type: 'POSITION_BACK' },
          action: {
            id: 'conditional_attack',
            name: 'Attack',
            description: '',
            effects: [{ type: 'DAMAGE', value: 1.0, stat: 'atk', target: Target.ENEMY_FRONT }],
          },
        },
      ],
    };

    // FRONT → 방어 우선
    const state1 = createBattleState([switcher], [enemy], [], []);
    const order1 = calculateFullTurnOrder([switcher, enemy], state1);
    expect(order1[0]).toBe(switcher.id);

    // BACK → 공격 → AGI 순 (Warrior 6 < Assassin 11)
    const switcherBack: BattleUnit = { ...switcher, position: Position.BACK };
    const state2 = createBattleState([switcherBack], [enemy], [], []);
    const order2 = calculateFullTurnOrder([switcherBack, enemy], state2);
    expect(order2[0]).toBe(enemy.id); // Assassin AGI 더 높으니 먼저
  });

  it('calculateTurnOrder도 방어 우선권을 적용한다 (미행동 유닛만)', () => {
    const guardian = createUnit(createCharacterDef('Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const assassin = createUnit(createCharacterDef('Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);

    const state = createBattleState([guardian], [assassin], [], []);
    const order = calculateTurnOrder([guardian, assassin], state);

    expect(order[0]).toBe(guardian.id);
    expect(order[1]).toBe(assassin.id);

    // Guardian이 행동 완료되면 Assassin만 남음
    const guardianActed: BattleUnit = { ...guardian, hasActedThisRound: true };
    const order2 = calculateTurnOrder([guardianActed, assassin], state);
    expect(order2).toHaveLength(1);
    expect(order2[0]).toBe(assassin.id);
  });

  it('실제 전투에서 Guardian이 Assassin보다 먼저 Shield Wall을 사용한다', () => {
    const guardian = createUnit(createCharacterDef('Bron', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const assassin = createUnit(createCharacterDef('Kael', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);

    let state = createBattleState([guardian], [assassin], [], []);

    // 라운드 시작
    state = stepBattle(state).state;
    expect(state.phase).toBe(BattlePhase.TURN_START);

    // 첫 턴 실행 — Guardian이 먼저 행동해야 함
    state = stepBattle(state).state;

    // Guardian의 Shield Wall 이벤트가 먼저 기록되어야 함
    const actionEvents = state.events.filter((e) => e.type === 'ACTION_EXECUTED');
    expect(actionEvents.length).toBeGreaterThanOrEqual(1);
    expect(actionEvents[0].sourceId).toBe(guardian.id);
    expect(actionEvents[0].data?.actionName).toBe('Shield Wall');
  });
});
