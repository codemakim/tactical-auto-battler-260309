import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, BuffType } from '../types';
import type { BattleState, ActionSlot, Buff } from '../types';
import { uid, resetUid } from '../utils/uid';
import { applyBuff, getEffectiveStats, tickBuffs, processStatusEffects, isStunned } from '../systems/BuffSystem';
import { executeAction } from '../systems/ActionResolver';
import { calculateDamage } from '../systems/DamageSystem';
import { startRound, endRound } from '../core/RoundManager';

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

describe('버프 시스템 - 버프 적용', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('ATK_UP 버프가 유닛에 추가된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const buff: Buff = { id: uid(), type: BuffType.ATK_UP, value: 5, duration: 2, sourceId: 'src' };

    const result = applyBuff(unit, buff, 1, 1);
    expect(result.unit.buffs).toHaveLength(1);
    expect(result.unit.buffs[0].type).toBe(BuffType.ATK_UP);
    expect(result.unit.buffs[0].value).toBe(5);
    expect(result.unit.buffs[0].duration).toBe(2);
  });

  it('GUARD_DOWN 디버프가 유닛에 추가된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const buff: Buff = { id: uid(), type: BuffType.GUARD_DOWN, value: 3, duration: 1, sourceId: 'src' };

    const result = applyBuff(unit, buff, 1, 1);
    expect(result.unit.buffs).toHaveLength(1);
    expect(result.unit.buffs[0].type).toBe(BuffType.GUARD_DOWN);
  });

  it('버프 적용 시 이벤트가 생성된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const buff: Buff = { id: uid(), type: BuffType.ATK_UP, value: 5, duration: 2, sourceId: 'src' };

    const result = applyBuff(unit, buff, 1, 1);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('BUFF_APPLIED');
    expect(result.events[0].targetId).toBe(unit.id);
  });

  it('디버프 적용 시 DEBUFF_APPLIED 이벤트가 생성된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const buff: Buff = { id: uid(), type: BuffType.ATK_DOWN, value: 3, duration: 1, sourceId: 'src' };

    const result = applyBuff(unit, buff, 1, 1);
    expect(result.events[0].type).toBe('DEBUFF_APPLIED');
  });

  it('같은 유닛에 여러 버프가 누적된다', () => {
    let unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const buff1: Buff = { id: uid(), type: BuffType.ATK_UP, value: 5, duration: 2, sourceId: 'src' };
    const buff2: Buff = { id: uid(), type: BuffType.GUARD_UP, value: 3, duration: 1, sourceId: 'src' };

    unit = applyBuff(unit, buff1, 1, 1).unit;
    unit = applyBuff(unit, buff2, 1, 1).unit;

    expect(unit.buffs).toHaveLength(2);
  });
});

describe('버프 시스템 - 유효 스탯 계산', () => {
  beforeEach(() => resetUnitCounter());

  it('ATK_UP이 공격력에 반영된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const baseAtk = unit.stats.atk;
    unit.buffs = [{ id: '1', type: BuffType.ATK_UP, value: 5, duration: 2, sourceId: 'src' }];

    const effective = getEffectiveStats(unit);
    expect(effective.atk).toBe(baseAtk + 5);
  });

  it('ATK_DOWN이 공격력을 감소시킨다 (최소 0)', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const baseAtk = unit.stats.atk;
    unit.buffs = [{ id: '1', type: BuffType.ATK_DOWN, value: 3, duration: 1, sourceId: 'src' }];

    const effective = getEffectiveStats(unit);
    expect(effective.atk).toBe(baseAtk - 3);
  });

  it('GUARD_UP이 GRD에 반영된다', () => {
    const unit = createUnit(createCharacterDef('G', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const baseGuard = unit.stats.grd;
    unit.buffs = [{ id: '1', type: BuffType.GUARD_UP, value: 4, duration: 2, sourceId: 'src' }];

    const effective = getEffectiveStats(unit);
    expect(effective.grd).toBe(baseGuard + 4);
  });

  it('AGI_UP이 민첩에 반영된다', () => {
    const unit = createUnit(createCharacterDef('A', CharacterClass.ASSASSIN), Team.PLAYER, Position.FRONT);
    const baseAgi = unit.stats.agi;
    unit.buffs = [{ id: '1', type: BuffType.AGI_UP, value: 3, duration: 1, sourceId: 'src' }];

    const effective = getEffectiveStats(unit);
    expect(effective.agi).toBe(baseAgi + 3);
  });

  it('여러 버프가 누적 적용된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const baseAtk = unit.stats.atk;
    unit.buffs = [
      { id: '1', type: BuffType.ATK_UP, value: 5, duration: 2, sourceId: 'src' },
      { id: '2', type: BuffType.ATK_UP, value: 3, duration: 1, sourceId: 'src' },
    ];

    const effective = getEffectiveStats(unit);
    expect(effective.atk).toBe(baseAtk + 8);
  });

  it('버프와 디버프가 동시에 적용된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const baseAtk = unit.stats.atk;
    unit.buffs = [
      { id: '1', type: BuffType.ATK_UP, value: 10, duration: 2, sourceId: 'src' },
      { id: '2', type: BuffType.ATK_DOWN, value: 3, duration: 1, sourceId: 'src' },
    ];

    const effective = getEffectiveStats(unit);
    expect(effective.atk).toBe(baseAtk + 7);
  });

  it('스탯은 최소 0 미만으로 내려가지 않는다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.buffs = [{ id: '1', type: BuffType.ATK_DOWN, value: 999, duration: 1, sourceId: 'src' }];

    const effective = getEffectiveStats(unit);
    expect(effective.atk).toBe(0);
  });

  it('POISON/REGEN/STUN은 스탯에 영향을 주지 않는다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const baseStats = { ...unit.stats };
    unit.buffs = [
      { id: '1', type: BuffType.POISON, value: 5, duration: 2, sourceId: 'src' },
      { id: '2', type: BuffType.REGEN, value: 3, duration: 2, sourceId: 'src' },
      { id: '3', type: BuffType.STUN, value: 0, duration: 1, sourceId: 'src' },
    ];

    const effective = getEffectiveStats(unit);
    expect(effective.atk).toBe(baseStats.atk);
    expect(effective.grd).toBe(baseStats.grd);
    expect(effective.agi).toBe(baseStats.agi);
  });
});

describe('버프 시스템 - 지속시간 감소 (라운드 종료)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('tickBuffs: 모든 버프의 duration이 1 감소한다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.buffs = [
      { id: '1', type: BuffType.ATK_UP, value: 5, duration: 3, sourceId: 'src' },
      { id: '2', type: BuffType.GUARD_UP, value: 3, duration: 1, sourceId: 'src' },
    ];

    const result = tickBuffs(unit, 1, 1);
    const remaining = result.unit.buffs;
    // duration 3 → 2 (유지)
    expect(remaining.find((b) => b.id === '1')?.duration).toBe(2);
  });

  it('tickBuffs: duration이 0이 되면 버프가 제거된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.buffs = [
      { id: '1', type: BuffType.ATK_UP, value: 5, duration: 3, sourceId: 'src' },
      { id: '2', type: BuffType.GUARD_UP, value: 3, duration: 1, sourceId: 'src' },
    ];

    const result = tickBuffs(unit, 1, 1);
    // duration 1 → 0 → 제거
    expect(result.unit.buffs).toHaveLength(1);
    expect(result.unit.buffs[0].id).toBe('1');
  });

  it('tickBuffs: 만료된 버프에 대해 BUFF_EXPIRED 이벤트가 생성된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.buffs = [{ id: '1', type: BuffType.GUARD_UP, value: 3, duration: 1, sourceId: 'src' }];

    const result = tickBuffs(unit, 1, 1);
    expect(result.events.some((e) => e.type === 'BUFF_EXPIRED')).toBe(true);
  });

  it('tickBuffs: 버프가 없으면 아무 일도 안 한다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const result = tickBuffs(unit, 1, 1);
    expect(result.unit.buffs).toHaveLength(0);
    expect(result.events).toHaveLength(0);
  });
});

describe('버프 시스템 - 상태이상 처리 (라운드 시작)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  it('POISON: 라운드 시작 시 value만큼 HP가 감소한다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const hpBefore = unit.stats.hp;
    unit.buffs = [{ id: '1', type: BuffType.POISON, value: 5, duration: 2, sourceId: 'src' }];

    const result = processStatusEffects(unit, 1, 1);
    expect(result.unit.stats.hp).toBe(hpBefore - 5);
  });

  it('POISON: STATUS_EFFECT_TICK 이벤트가 생성된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.buffs = [{ id: '1', type: BuffType.POISON, value: 5, duration: 2, sourceId: 'src' }];

    const result = processStatusEffects(unit, 1, 1);
    expect(result.events.some((e) => e.type === 'STATUS_EFFECT_TICK')).toBe(true);
  });

  it('POISON: HP가 0 이하가 되면 유닛이 사망한다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.stats.hp = 3;
    unit.buffs = [{ id: '1', type: BuffType.POISON, value: 5, duration: 2, sourceId: 'src' }];

    const result = processStatusEffects(unit, 1, 1);
    expect(result.unit.stats.hp).toBe(0);
    expect(result.unit.isAlive).toBe(false);
    expect(result.events.some((e) => e.type === 'UNIT_DIED')).toBe(true);
  });

  it('REGEN: 라운드 시작 시 value만큼 HP가 회복된다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.stats.hp = unit.stats.maxHp - 10;
    const hpBefore = unit.stats.hp;
    unit.buffs = [{ id: '1', type: BuffType.REGEN, value: 5, duration: 2, sourceId: 'src' }];

    const result = processStatusEffects(unit, 1, 1);
    expect(result.unit.stats.hp).toBe(hpBefore + 5);
  });

  it('REGEN: maxHp를 초과하지 않는다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.stats.hp = unit.stats.maxHp - 2;
    unit.buffs = [{ id: '1', type: BuffType.REGEN, value: 10, duration: 2, sourceId: 'src' }];

    const result = processStatusEffects(unit, 1, 1);
    expect(result.unit.stats.hp).toBe(unit.stats.maxHp);
  });

  it('상태이상이 없으면 HP가 변하지 않는다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const hpBefore = unit.stats.hp;
    unit.buffs = [{ id: '1', type: BuffType.ATK_UP, value: 5, duration: 2, sourceId: 'src' }];

    const result = processStatusEffects(unit, 1, 1);
    expect(result.unit.stats.hp).toBe(hpBefore);
  });
});

describe('버프 시스템 - 스턴', () => {
  beforeEach(() => resetUnitCounter());

  it('STUN 버프가 있으면 isStunned가 true를 반환한다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    unit.buffs = [{ id: '1', type: BuffType.STUN, value: 0, duration: 1, sourceId: 'src' }];

    expect(isStunned(unit)).toBe(true);
  });

  it('STUN 버프가 없으면 isStunned가 false를 반환한다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    expect(isStunned(unit)).toBe(false);
  });
});

describe('버프 시스템 - 데미지 계산 연동', () => {
  beforeEach(() => resetUnitCounter());

  it('ATK_UP 버프가 데미지 계산에 반영된다', () => {
    const attacker = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const defender = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const baseDmg = calculateDamage(attacker, defender, 1.0);

    attacker.buffs = [{ id: '1', type: BuffType.ATK_UP, value: 10, duration: 2, sourceId: 'src' }];
    const buffedDmg = calculateDamage(attacker, defender, 1.0);

    expect(buffedDmg).toBe(baseDmg + 10);
  });

  it('GUARD_UP 버프는 데미지 계산에 영향을 주지 않는다 (GRD는 실드 생성용)', () => {
    const attacker = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const defender = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const baseDmg = calculateDamage(attacker, defender, 1.0);

    defender.buffs = [{ id: '1', type: BuffType.GUARD_UP, value: 5, duration: 2, sourceId: 'src' }];
    const buffedDmg = calculateDamage(attacker, defender, 1.0);

    // GRD는 데미지 감산에 사용되지 않으므로 동일
    expect(buffedDmg).toBe(baseDmg);
  });
});
