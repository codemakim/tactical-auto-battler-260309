import { describe, it, expect, beforeEach } from 'vitest';
import { applyBuff } from '../systems/BuffSystem';
import { BuffType } from '../types';
import type { BattleUnit, Buff } from '../types';
import { uid } from '../utils/uid';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Position, Team } from '../types';

function makeCoverBuff(sourceId: string, duration: number = 1): Buff {
  return {
    id: uid(),
    type: BuffType.COVER,
    value: 0,
    duration,
    sourceId,
  };
}

describe('COVER 중첩 방지 (갱신 방식)', () => {
  let unit: BattleUnit;

  beforeEach(() => {
    resetUnitCounter();
    unit = createUnit(createCharacterDef('Theron', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
  });

  it('COVER가 없을 때 새로 추가된다', () => {
    const buff = makeCoverBuff('src1', 2);
    const { unit: updated } = applyBuff(unit, buff, 1, 1);

    const covers = updated.buffs.filter((b) => b.type === BuffType.COVER);
    expect(covers).toHaveLength(1);
    expect(covers[0].duration).toBe(2);
  });

  it('COVER가 이미 있으면 중첩되지 않고 duration이 갱신된다', () => {
    // 첫 번째 COVER 적용
    const buff1 = makeCoverBuff('src1', 1);
    const { unit: after1 } = applyBuff(unit, buff1, 1, 1);
    expect(after1.buffs.filter((b) => b.type === BuffType.COVER)).toHaveLength(1);

    // 두 번째 COVER 적용 → 중첩 아닌 갱신
    const buff2 = makeCoverBuff('src1', 3);
    const { unit: after2 } = applyBuff(after1, buff2, 1, 2);

    const covers = after2.buffs.filter((b) => b.type === BuffType.COVER);
    expect(covers).toHaveLength(1); // 여전히 1개
    expect(covers[0].duration).toBe(3); // duration 갱신됨
  });

  it('COVER 갱신 시 sourceId도 업데이트된다', () => {
    const buff1 = makeCoverBuff('unit_a', 1);
    const { unit: after1 } = applyBuff(unit, buff1, 1, 1);

    const buff2 = makeCoverBuff('unit_b', 2);
    const { unit: after2 } = applyBuff(after1, buff2, 1, 2);

    const cover = after2.buffs.find((b) => b.type === BuffType.COVER)!;
    expect(cover.sourceId).toBe('unit_b');
  });

  it('COVER가 아닌 다른 버프는 정상 중첩된다', () => {
    const atkUp1: Buff = {
      id: uid(),
      type: BuffType.ATK_UP,
      value: 3,
      duration: 2,
      sourceId: 'src1',
    };
    const atkUp2: Buff = {
      id: uid(),
      type: BuffType.ATK_UP,
      value: 5,
      duration: 1,
      sourceId: 'src2',
    };

    const { unit: after1 } = applyBuff(unit, atkUp1, 1, 1);
    const { unit: after2 } = applyBuff(after1, atkUp2, 1, 2);

    const atkBuffs = after2.buffs.filter((b) => b.type === BuffType.ATK_UP);
    expect(atkBuffs).toHaveLength(2); // 정상 중첩
  });

  it('COVER와 다른 버프가 공존할 수 있다', () => {
    const cover = makeCoverBuff('src1', 2);
    const atkUp: Buff = {
      id: uid(),
      type: BuffType.ATK_UP,
      value: 3,
      duration: 2,
      sourceId: 'src1',
    };

    const { unit: after1 } = applyBuff(unit, cover, 1, 1);
    const { unit: after2 } = applyBuff(after1, atkUp, 1, 2);

    expect(after2.buffs).toHaveLength(2);
    expect(after2.buffs.filter((b) => b.type === BuffType.COVER)).toHaveLength(1);
    expect(after2.buffs.filter((b) => b.type === BuffType.ATK_UP)).toHaveLength(1);
  });
});
