import { describe, it, expect, beforeEach } from 'vitest';
import { BuffType, Position, Team } from '../types';
import type { BattleUnit, Buff } from '../types';
import { findCoverUnit } from '../systems/CoverSystem';
import { applyDamageWithCover } from '../systems/DamageSystem';
import { resetUid } from '../utils/uid';

// 테스트용 유닛 생성 헬퍼
function makeUnit(overrides: Partial<BattleUnit> & { id: string }): BattleUnit {
  return {
    definitionId: 'test',
    name: overrides.id,
    characterClass: 'WARRIOR',
    team: Team.PLAYER,
    position: Position.FRONT,
    stats: { hp: 50, maxHp: 50, atk: 10, grd: 10, agi: 5 },
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

function makeCoverBuff(sourceId: string = 'guardian'): Buff {
  return {
    id: 'cover_buff_1',
    type: BuffType.COVER,
    value: 0,
    duration: 1,
    sourceId,
  };
}

describe('CoverSystem', () => {
  beforeEach(() => resetUid());

  describe('findCoverUnit — 커버 유닛 탐색', () => {
    it('§25.2 COVER 버프 보유 + 전열 + 생존 유닛이 커버', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });
      const enemy = makeUnit({
        id: 'enemy',
        team: Team.ENEMY,
      });

      const cover = findCoverUnit(archer, [guardian, archer, enemy]);
      expect(cover).not.toBeNull();
      expect(cover!.id).toBe('guardian');
    });

    it('§25.5 공격 대상이 전열이면 커버 발동 안 함', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
      });
      const frontAlly = makeUnit({
        id: 'front_ally',
        position: Position.FRONT,
        team: Team.PLAYER,
      });

      const cover = findCoverUnit(frontAlly, [guardian, frontAlly]);
      expect(cover).toBeNull();
    });

    it('§25.2 COVER 버프가 없으면 커버 발동 안 함', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [], // COVER 없음
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });

      const cover = findCoverUnit(archer, [guardian, archer]);
      expect(cover).toBeNull();
    });

    it('§25.2 커버 유닛이 후열이면 커버 안 함', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.BACK, // 후열
        buffs: [makeCoverBuff()],
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });

      const cover = findCoverUnit(archer, [guardian, archer]);
      expect(cover).toBeNull();
    });

    it('§25.2 커버 유닛이 사망이면 커버 안 함', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
        isAlive: false,
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });

      const cover = findCoverUnit(archer, [guardian, archer]);
      expect(cover).toBeNull();
    });

    it('§25.5 커버 유닛 자신이 타겟이면 커버 안 함', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
      });

      // guardian 자신이 타겟
      const cover = findCoverUnit(guardian, [guardian]);
      expect(cover).toBeNull();
    });

    it('§25.4 커버 후보가 여러 명이면 AGI 높은 유닛이 커버', () => {
      const g1 = makeUnit({
        id: 'g1',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
        stats: { hp: 50, maxHp: 50, atk: 10, grd: 10, agi: 4 },
      });
      const g2 = makeUnit({
        id: 'g2',
        position: Position.FRONT,
        buffs: [makeCoverBuff('g2')],
        stats: { hp: 50, maxHp: 50, atk: 10, grd: 10, agi: 8 },
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });

      const cover = findCoverUnit(archer, [g1, g2, archer]);
      expect(cover!.id).toBe('g2');
    });

    it('§25.5 다른 팀의 COVER 유닛은 커버 안 함', () => {
      const enemyGuardian = makeUnit({
        id: 'enemy_guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
        team: Team.ENEMY,
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });

      const cover = findCoverUnit(archer, [enemyGuardian, archer]);
      expect(cover).toBeNull();
    });
  });

  describe('applyDamageWithCover — 커버 적용 데미지', () => {
    it('§25.3 후열 타겟 공격 시 커버 유닛이 대신 피격', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
        shield: 10,
        stats: { hp: 50, maxHp: 50, atk: 10, grd: 10, agi: 5 },
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
        stats: { hp: 40, maxHp: 40, atk: 13, grd: 4, agi: 10 },
      });
      const enemy = makeUnit({
        id: 'enemy',
        team: Team.ENEMY,
      });

      const result = applyDamageWithCover(
        archer, // 원래 타겟
        20, // 데미지
        enemy.id, // 공격자
        [guardian, archer, enemy],
        1,
        1,
      );

      // archer는 피해 없음
      const updatedArcher = result.units.find((u) => u.id === 'archer')!;
      expect(updatedArcher.stats.hp).toBe(40);

      // guardian이 대신 피격 (실드 10 흡수 + HP 10 감소)
      const updatedGuardian = result.units.find((u) => u.id === 'guardian')!;
      expect(updatedGuardian.stats.hp).toBe(40);
      expect(updatedGuardian.shield).toBe(0);

      // COVER_TRIGGERED 이벤트 존재
      const coverEvent = result.events.find((e) => e.type === 'COVER_TRIGGERED');
      expect(coverEvent).toBeDefined();
      expect(coverEvent!.targetId).toBe('guardian');
      expect(coverEvent!.data?.originalTargetId).toBe('archer');
    });

    it('§25.3 커버 유닛이 없으면 원래 타겟이 피격', () => {
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
        stats: { hp: 40, maxHp: 40, atk: 13, grd: 4, agi: 10 },
      });
      const enemy = makeUnit({
        id: 'enemy',
        team: Team.ENEMY,
      });

      const result = applyDamageWithCover(archer, 20, enemy.id, [archer, enemy], 1, 1);

      const updatedArcher = result.units.find((u) => u.id === 'archer')!;
      expect(updatedArcher.stats.hp).toBe(20);

      // COVER_TRIGGERED 이벤트 없음
      const coverEvent = result.events.find((e) => e.type === 'COVER_TRIGGERED');
      expect(coverEvent).toBeUndefined();
    });

    it('§25.3 커버로 커버 유닛이 사망할 수 있음', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
        stats: { hp: 5, maxHp: 50, atk: 10, grd: 10, agi: 5 },
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });
      const enemy = makeUnit({
        id: 'enemy',
        team: Team.ENEMY,
      });

      const result = applyDamageWithCover(archer, 20, enemy.id, [guardian, archer, enemy], 1, 1);

      const updatedGuardian = result.units.find((u) => u.id === 'guardian')!;
      expect(updatedGuardian.isAlive).toBe(false);
      expect(updatedGuardian.stats.hp).toBe(0);

      // archer는 무사
      const updatedArcher = result.units.find((u) => u.id === 'archer')!;
      expect(updatedArcher.stats.hp).toBe(50);

      // UNIT_DIED 이벤트
      const diedEvent = result.events.find((e) => e.type === 'UNIT_DIED');
      expect(diedEvent).toBeDefined();
      expect(diedEvent!.targetId).toBe('guardian');
    });

    it('§25.3 커버 발동 시 실드가 먼저 흡수', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
        shield: 15,
        stats: { hp: 50, maxHp: 50, atk: 10, grd: 10, agi: 5 },
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });
      const enemy = makeUnit({ id: 'enemy', team: Team.ENEMY });

      const result = applyDamageWithCover(archer, 10, enemy.id, [guardian, archer, enemy], 1, 1);

      const updatedGuardian = result.units.find((u) => u.id === 'guardian')!;
      expect(updatedGuardian.shield).toBe(5); // 15 - 10
      expect(updatedGuardian.stats.hp).toBe(50); // HP 무손실
    });

    it('§25.4 COVER 버프는 라운드 내 여러 번 발동 가능', () => {
      const guardian = makeUnit({
        id: 'guardian',
        position: Position.FRONT,
        buffs: [makeCoverBuff()],
        shield: 30,
        stats: { hp: 50, maxHp: 50, atk: 10, grd: 10, agi: 5 },
      });
      const archer = makeUnit({
        id: 'archer',
        position: Position.BACK,
        team: Team.PLAYER,
      });
      const enemy = makeUnit({ id: 'enemy', team: Team.ENEMY });

      // 첫 번째 공격
      const r1 = applyDamageWithCover(archer, 10, enemy.id, [guardian, archer, enemy], 1, 1);
      const g1 = r1.units.find((u) => u.id === 'guardian')!;
      expect(g1.buffs.some((b) => b.type === BuffType.COVER)).toBe(true); // 버프 유지

      // 두 번째 공격 (업데이트된 유닛으로)
      const r2 = applyDamageWithCover(r1.units.find((u) => u.id === 'archer')!, 10, enemy.id, r1.units, 1, 2);
      const g2 = r2.units.find((u) => u.id === 'guardian')!;
      expect(g2.shield).toBe(10); // 30 - 10 - 10
      expect(g2.stats.hp).toBe(50); // HP 무손실

      // 두 번 다 COVER_TRIGGERED
      expect(r1.events.filter((e) => e.type === 'COVER_TRIGGERED')).toHaveLength(1);
      expect(r2.events.filter((e) => e.type === 'COVER_TRIGGERED')).toHaveLength(1);
    });
  });
});
