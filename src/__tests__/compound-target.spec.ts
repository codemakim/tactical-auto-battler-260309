import { describe, it, expect, beforeEach } from 'vitest';
import { selectTarget } from '../systems/TargetSelector';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, Target, TargetSelect } from '../types';
import type { ActionTargetType, BattleUnit, BattleState } from '../types';

/** 테스트용 간이 BattleState 생성 */
function makeMockState(units: BattleUnit[], turnOrder: string[], turn = 1): BattleState {
  return {
    units,
    round: 1,
    turn,
    turnOrder,
    phase: 'ACTION_RESOLVE',
    events: [],
    delayedEffects: [],
    reserveUnits: { PLAYER: [], ENEMY: [] },
  } as unknown as BattleState;
}

describe('복합 타겟 시스템', () => {
  beforeEach(() => resetUnitCounter());

  describe('기존 Target.* 상수 호환', () => {
    it('Target.ENEMY_FRONT는 전열 AGI 최고 적 선택', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
      // Lancer AGI > Warrior AGI

      const target = selectTarget(player, Target.ENEMY_FRONT, [player, e1, e2]);
      expect(target?.id).toBe(e2.id);
    });

    it('Target.ENEMY_ANY는 HP 최저 적 선택', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.WARRIOR), Team.ENEMY, Position.BACK);
      // HP를 조작
      e1.stats.hp = 30;
      e2.stats.hp = 20;

      const target = selectTarget(player, Target.ENEMY_ANY, [player, e1, e2]);
      expect(target?.id).toBe(e2.id);
    });

    it('Target.SELF는 자기 자신 반환', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const target = selectTarget(player, Target.SELF, [player]);
      expect(target?.id).toBe(player.id);
    });
  });

  describe('새 조합: position × select', () => {
    it('ENEMY + FRONT + LOWEST_HP: 전열 중 HP 가장 낮은 적', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
      const eBack = createUnit(createCharacterDef('EB', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);

      e1.stats.hp = 30;
      e2.stats.hp = 10; // 전열 중 가장 낮음
      eBack.stats.hp = 5; // 전체 최저이지만 후열

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'FRONT', select: 'LOWEST_HP' };
      const target = selectTarget(player, targetType, [player, e1, e2, eBack]);
      expect(target?.id).toBe(e2.id); // 전열 중 HP 최저
    });

    it('ENEMY + ANY + HIGHEST_AGI: 전체 적 중 AGI 최고', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
      // Assassin AGI > Warrior AGI

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'ANY', select: 'HIGHEST_AGI' };
      const target = selectTarget(player, targetType, [player, e1, e2]);
      expect(target?.id).toBe(e2.id);
    });

    it('ENEMY + FRONT + RANDOM: 전열 적 중 랜덤 선택 (null 아님)', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'FRONT', select: 'RANDOM' };
      const target = selectTarget(player, targetType, [player, e1, e2]);
      expect(target).not.toBeNull();
      expect([e1.id, e2.id]).toContain(target!.id);
    });

    it('ALLY + FRONT + LOWEST_HP: 전열 아군 중 HP 최저', () => {
      const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const p2 = createUnit(createCharacterDef('P2', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);

      p2.stats.hp = 10; // 전열 아군 중 최저
      p3.stats.hp = 5; // 전체 최저이지만 후열

      const targetType: ActionTargetType = { side: 'ALLY', position: 'FRONT', select: 'LOWEST_HP' };
      const target = selectTarget(p1, targetType, [p1, p2, p3]);
      expect(target?.id).toBe(p2.id);
    });
  });

  describe('포지션 폴백', () => {
    it('FRONT 지정인데 전열 적 없으면 전체 적으로 폴백', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const eBack = createUnit(createCharacterDef('EB', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'FRONT', select: 'HIGHEST_AGI' };
      const target = selectTarget(player, targetType, [player, eBack]);
      expect(target?.id).toBe(eBack.id); // 폴백으로 후열 적 선택
    });

    it('BACK 지정인데 후열 적 없으면 전체 적으로 폴백', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const eFront = createUnit(createCharacterDef('EF', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'BACK', select: 'LOWEST_HP' };
      const target = selectTarget(player, targetType, [player, eFront]);
      expect(target?.id).toBe(eFront.id);
    });
  });

  describe('FASTEST_TURN 선택', () => {
    it('state가 있으면 turnOrder 기반으로 선택', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
      const e3 = createUnit(createCharacterDef('E3', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);

      const allUnits = [player, e1, e2, e3];
      // turnOrder: e3이 가장 빠름
      const state = makeMockState(allUnits, [e3.id, e1.id, player.id, e2.id]);

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'ANY', select: 'FASTEST_TURN' };
      const target = selectTarget(player, targetType, allUnits, state);
      expect(target?.id).toBe(e3.id);
    });

    it('FASTEST_TURN + FRONT: 전열 적 중 턴 순서 가장 빠른 유닛', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
      const eBack = createUnit(createCharacterDef('EB', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);

      const allUnits = [player, e1, e2, eBack];
      // eBack이 턴 순서 1등이지만 후열 → 전열 필터에 의해 제외
      const state = makeMockState(allUnits, [eBack.id, e2.id, e1.id, player.id]);

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'FRONT', select: 'FASTEST_TURN' };
      const target = selectTarget(player, targetType, allUnits, state);
      expect(target?.id).toBe(e2.id); // 전열 중 turnOrder 가장 빠름
    });

    it('state 없으면 HIGHEST_AGI 폴백', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      const e2 = createUnit(createCharacterDef('E2', CharacterClass.ASSASSIN), Team.ENEMY, Position.FRONT);
      // Assassin AGI > Warrior AGI

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'FRONT', select: 'FASTEST_TURN' };
      const target = selectTarget(player, targetType, [player, e1, e2]); // state 없음
      expect(target?.id).toBe(e2.id); // AGI 높은 Assassin
    });
  });

  describe('FIRST 선택', () => {
    it('후보 중 배열 첫 번째 유닛 반환', () => {
      const p1 = createUnit(createCharacterDef('P1', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const p2 = createUnit(createCharacterDef('P2', CharacterClass.LANCER), Team.PLAYER, Position.FRONT);
      const p3 = createUnit(createCharacterDef('P3', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);

      const targetType: ActionTargetType = { side: 'ALLY', position: 'ANY', select: 'FIRST' };
      const target = selectTarget(p1, targetType, [p1, p2, p3]);
      expect(target?.id).toBe(p2.id); // p1 제외, 첫 번째 아군 = p2
    });
  });

  describe('대상 없음 처리', () => {
    it('적이 전부 죽으면 null 반환', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      enemy.isAlive = false;

      const targetType: ActionTargetType = { side: 'ENEMY', position: 'FRONT', select: 'LOWEST_HP' };
      const target = selectTarget(player, targetType, [player, enemy]);
      expect(target).toBeNull();
    });

    it('아군이 자신밖에 없으면 ALLY 타겟은 null', () => {
      const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

      const targetType: ActionTargetType = { side: 'ALLY', position: 'ANY', select: 'LOWEST_HP' };
      const target = selectTarget(player, targetType, [player]);
      expect(target).toBeNull();
    });
  });
});
