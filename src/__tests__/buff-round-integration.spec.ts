import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, runFullBattle } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, BuffType } from '../types';
import type { BattleState, ActionSlot } from '../types';
import { resetUid } from '../utils/uid';
import { startRound, endRound } from '../core/RoundManager';
import { executeAction } from '../systems/ActionResolver';

describe('라운드 시작 - 상태이상 처리 (§6.5)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('라운드 시작 시 POISON 유닛의 HP가 감소한다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.buffs = [{ id: '1', type: BuffType.POISON, value: 5, duration: 2, sourceId: e1.id }];
    const hpBefore = p1.stats.hp;

    const state = createBattleState([p1], [e1], [], []);
    const afterRound = startRound(state);

    const poisonedUnit = afterRound.units.find(u => u.id === p1.id);
    expect(poisonedUnit!.stats.hp).toBe(hpBefore - 5);
  });

  it('라운드 시작 시 REGEN 유닛의 HP가 회복된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.stats.hp = p1.stats.maxHp - 10;
    const hpBefore = p1.stats.hp;
    p1.buffs = [{ id: '1', type: BuffType.REGEN, value: 5, duration: 2, sourceId: p1.id }];

    const state = createBattleState([p1], [e1], [], []);
    const afterRound = startRound(state);

    const regenUnit = afterRound.units.find(u => u.id === p1.id);
    expect(regenUnit!.stats.hp).toBe(hpBefore + 5);
  });

  it('라운드 시작 시 독으로 유닛이 사망하면 이벤트가 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.stats.hp = 3;
    p1.buffs = [{ id: '1', type: BuffType.POISON, value: 10, duration: 2, sourceId: e1.id }];

    const state = createBattleState([p1], [e1], [], []);
    const afterRound = startRound(state);

    const deadUnit = afterRound.units.find(u => u.id === p1.id);
    expect(deadUnit!.isAlive).toBe(false);
    expect(afterRound.events.some(e => e.type === 'UNIT_DIED')).toBe(true);
  });

  it('상태이상 처리 이벤트가 ROUND_START 이벤트 뒤에 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.buffs = [{ id: '1', type: BuffType.POISON, value: 5, duration: 2, sourceId: e1.id }];

    const state = createBattleState([p1], [e1], [], []);
    const afterRound = startRound(state);

    const roundStartIdx = afterRound.events.findIndex(e => e.type === 'ROUND_START');
    const tickIdx = afterRound.events.findIndex(e => e.type === 'STATUS_EFFECT_TICK');
    expect(roundStartIdx).toBeLessThan(tickIdx);
  });
});

describe('라운드 종료 - 버프 지속시간 감소 (§7.1)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('라운드 종료 시 모든 유닛의 버프 duration이 감소한다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.buffs = [{ id: '1', type: BuffType.ATK_UP, value: 5, duration: 3, sourceId: p1.id }];

    const state: BattleState = {
      units: [p1, e1],
      reserve: [],
      hero: { interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
      round: 1,
      turn: 6,
      turnOrder: [],
      phase: BattlePhase.ROUND_END,
      events: [],
      delayedEffects: [],
      isFinished: false,
      winner: null,
      seed: 12345,
    };

    const afterEnd = endRound(state);
    const buffedUnit = afterEnd.units.find(u => u.id === p1.id);
    expect(buffedUnit!.buffs[0].duration).toBe(2);
  });

  it('라운드 종료 시 duration 0인 버프가 제거된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.buffs = [
      { id: '1', type: BuffType.ATK_UP, value: 5, duration: 1, sourceId: p1.id },
      { id: '2', type: BuffType.DEF_UP, value: 3, duration: 3, sourceId: p1.id },
    ];

    const state: BattleState = {
      units: [p1, e1],
      reserve: [],
      hero: { interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
      round: 1,
      turn: 6,
      turnOrder: [],
      phase: BattlePhase.ROUND_END,
      events: [],
      delayedEffects: [],
      isFinished: false,
      winner: null,
      seed: 12345,
    };

    const afterEnd = endRound(state);
    const buffedUnit = afterEnd.units.find(u => u.id === p1.id);
    // duration 1인 ATK_UP은 제거, duration 3인 DEF_UP은 2로 감소
    expect(buffedUnit!.buffs).toHaveLength(1);
    expect(buffedUnit!.buffs[0].type).toBe(BuffType.DEF_UP);
    expect(buffedUnit!.buffs[0].duration).toBe(2);
  });

  it('라운드 종료 시 BUFF_EXPIRED 이벤트가 기록된다', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    p1.buffs = [{ id: '1', type: BuffType.ATK_UP, value: 5, duration: 1, sourceId: p1.id }];

    const state: BattleState = {
      units: [p1, e1],
      reserve: [],
      hero: { interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
      round: 1,
      turn: 6,
      turnOrder: [],
      phase: BattlePhase.ROUND_END,
      events: [],
      delayedEffects: [],
      isFinished: false,
      winner: null,
      seed: 12345,
    };

    const afterEnd = endRound(state);
    expect(afterEnd.events.some(e => e.type === 'BUFF_EXPIRED')).toBe(true);
  });
});

describe('ApplyBuff 액션 효과 - 전투 통합', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('BUFF 효과가 아군에게 버프를 부여한다', () => {
    const source = createUnit(createCharacterDef('C', CharacterClass.CONTROLLER), Team.PLAYER, Position.BACK);
    const ally = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'buff_atk',
        name: 'Battle Cry',
        description: '',
        effects: [{
          type: 'BUFF',
          target: 'ALLY_ANY',
          buffType: BuffType.ATK_UP,
          value: 5,
          duration: 2,
        }],
      },
    };

    const state: BattleState = {
      units: [source, ally, enemy],
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
    };

    const result = executeAction(source, slot, state);

    const buffedAlly = result.units.find(u => u.id === ally.id);
    expect(buffedAlly!.buffs).toHaveLength(1);
    expect(buffedAlly!.buffs[0].type).toBe(BuffType.ATK_UP);
    expect(buffedAlly!.buffs[0].value).toBe(5);
    expect(buffedAlly!.buffs[0].duration).toBe(2);
  });

  it('DEBUFF 효과가 적에게 디버프를 부여한다', () => {
    const source = createUnit(createCharacterDef('C', CharacterClass.CONTROLLER), Team.PLAYER, Position.BACK);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const slot: ActionSlot = {
      condition: { type: 'ALWAYS' },
      action: {
        id: 'debuff_def',
        name: 'Armor Break',
        description: '',
        effects: [{
          type: 'DEBUFF',
          target: 'ENEMY_FRONT',
          buffType: BuffType.DEF_DOWN,
          value: 3,
          duration: 2,
        }],
      },
    };

    const state: BattleState = {
      units: [source, enemy],
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
    };

    const result = executeAction(source, slot, state);

    const debuffedEnemy = result.units.find(u => u.id === enemy.id);
    expect(debuffedEnemy!.buffs).toHaveLength(1);
    expect(debuffedEnemy!.buffs[0].type).toBe(BuffType.DEF_DOWN);
  });

  it('STUN 디버프가 적용되면 대상이 다음 턴에 행동 불가', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.CONTROLLER), Team.PLAYER, Position.FRONT);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    // 스턴 부여
    e1.buffs = [{ id: '1', type: BuffType.STUN, value: 0, duration: 1, sourceId: p1.id }];

    // 스턴된 유닛에게 커스텀 액션 부여 (항상 실행 가능한 조건)
    e1.actionSlots = [
      { condition: { type: 'ALWAYS' }, action: { id: 'atk', name: 'Attack', description: '', effects: [{ type: 'DAMAGE', value: 1.0, target: 'ENEMY_FRONT' }] } },
    ];

    const state = createBattleState([p1], [e1], [], []);
    // 라운드 시작
    let current = stepBattle(state).state;

    // 모든 턴 실행
    let stunnedSkip = false;
    while (!current.isFinished && current.phase !== BattlePhase.ROUND_END) {
      current = stepBattle(current).state;
      // 스턴된 유닛의 ACTION_SKIPPED 이벤트 확인
      if (current.events.some(e => e.type === 'ACTION_SKIPPED' && e.sourceId === e1.id && e.data?.reason === 'stunned')) {
        stunnedSkip = true;
      }
    }

    expect(stunnedSkip).toBe(true);
  });
});
