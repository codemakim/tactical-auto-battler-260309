import { BuffType } from '../types';
import type { BattleUnit, BattleEvent, Buff, Stats } from '../types';
import { uid } from '../utils/uid';

// 디버프 타입 판별
const DEBUFF_TYPES: ReadonlySet<string> = new Set([
  BuffType.ATK_DOWN,
  BuffType.GUARD_DOWN,
  BuffType.AGI_DOWN,
  BuffType.POISON,
  BuffType.STUN,
]);

function isDebuff(type: BuffType): boolean {
  return DEBUFF_TYPES.has(type);
}

/**
 * 버프/디버프를 유닛에 적용
 */
export function applyBuff(
  unit: BattleUnit,
  buff: Buff,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  const updated: BattleUnit = {
    ...unit,
    buffs: [...unit.buffs, buff],
  };

  const eventType = isDebuff(buff.type) ? 'DEBUFF_APPLIED' : 'BUFF_APPLIED';

  return {
    unit: updated,
    events: [{
      id: uid(),
      type: eventType,
      round,
      turn,
      timestamp: Date.now(),
      sourceId: buff.sourceId,
      targetId: unit.id,
      data: { buffType: buff.type, value: buff.value, duration: buff.duration },
    }],
  };
}

/**
 * 버프를 반영한 유효 스탯 계산
 * 기본 스탯 + 버프 수정치 (최소 0)
 */
export function getEffectiveStats(unit: BattleUnit): Stats {
  let atkMod = 0;
  let grdMod = 0;
  let agiMod = 0;

  for (const buff of unit.buffs) {
    switch (buff.type) {
      case BuffType.ATK_UP: atkMod += buff.value; break;
      case BuffType.ATK_DOWN: atkMod -= buff.value; break;
      case BuffType.GUARD_UP: grdMod += buff.value; break;
      case BuffType.GUARD_DOWN: grdMod -= buff.value; break;
      case BuffType.AGI_UP: agiMod += buff.value; break;
      case BuffType.AGI_DOWN: agiMod -= buff.value; break;
      // POISON, REGEN, STUN은 스탯에 영향 없음
    }
  }

  return {
    ...unit.stats,
    atk: Math.max(0, unit.stats.atk + atkMod),
    grd: Math.max(0, unit.stats.grd + grdMod),
    agi: Math.max(0, unit.stats.agi + agiMod),
  };
}

/**
 * 버프 지속시간 감소 (라운드 종료 시 호출)
 * duration을 1 줄이고, 0이 되면 제거
 */
export function tickBuffs(
  unit: BattleUnit,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  const remaining: Buff[] = [];

  for (const buff of unit.buffs) {
    const newDuration = buff.duration - 1;
    if (newDuration <= 0) {
      events.push({
        id: uid(),
        type: 'BUFF_EXPIRED',
        round,
        turn,
        timestamp: Date.now(),
        targetId: unit.id,
        data: { buffType: buff.type, buffId: buff.id },
      });
    } else {
      remaining.push({ ...buff, duration: newDuration });
    }
  }

  return {
    unit: { ...unit, buffs: remaining },
    events,
  };
}

/**
 * 상태이상 틱 처리 (라운드 시작 시 호출)
 * POISON: HP 감소, REGEN: HP 회복
 */
export function processStatusEffects(
  unit: BattleUnit,
  round: number,
  turn: number,
): { unit: BattleUnit; events: BattleEvent[] } {
  const events: BattleEvent[] = [];
  let hp = unit.stats.hp;
  let isAlive = unit.isAlive;

  for (const buff of unit.buffs) {
    if (buff.type === BuffType.POISON) {
      hp = Math.max(0, hp - buff.value);
      events.push({
        id: uid(),
        type: 'STATUS_EFFECT_TICK',
        round,
        turn,
        timestamp: Date.now(),
        sourceId: buff.sourceId,
        targetId: unit.id,
        value: -buff.value,
        data: { buffType: BuffType.POISON, hpAfter: hp },
      });

      if (hp <= 0) {
        isAlive = false;
        events.push({
          id: uid(),
          type: 'UNIT_DIED',
          round,
          turn,
          timestamp: Date.now(),
          targetId: unit.id,
          data: { cause: 'poison' },
        });
      }
    } else if (buff.type === BuffType.REGEN) {
      const healed = Math.min(buff.value, unit.stats.maxHp - hp);
      hp += healed;
      events.push({
        id: uid(),
        type: 'STATUS_EFFECT_TICK',
        round,
        turn,
        timestamp: Date.now(),
        sourceId: buff.sourceId,
        targetId: unit.id,
        value: healed,
        data: { buffType: BuffType.REGEN, hpAfter: hp },
      });
    }
  }

  return {
    unit: {
      ...unit,
      stats: { ...unit.stats, hp },
      isAlive,
    },
    events,
  };
}

/**
 * 스턴 여부 확인
 */
export function isStunned(unit: BattleUnit): boolean {
  return unit.buffs.some(b => b.type === BuffType.STUN);
}
