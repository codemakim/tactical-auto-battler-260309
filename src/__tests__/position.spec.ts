import { describe, it, expect, beforeEach } from 'vitest';
import { moveUnit, pushUnit } from '../systems/PositionSystem';
import { selectTarget } from '../systems/TargetSelector';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

describe('포지션 시스템', () => {
  beforeEach(() => resetUnitCounter());

  it('전장은 FRONT / BACK 두 포지션만 존재한다', () => {
    const values = Object.values(Position);
    expect(values).toEqual(['FRONT', 'BACK']);
  });

  it('유닛은 FRONT에서 BACK으로 이동할 수 있다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const result = moveUnit(unit, Position.BACK, 1, 1);

    expect(result.unit.position).toBe(Position.BACK);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('UNIT_MOVED');
  });

  it('같은 포지션으로 이동하면 아무 일도 없다', () => {
    const unit = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const result = moveUnit(unit, Position.FRONT, 1, 1);

    expect(result.events).toHaveLength(0);
  });

  it('적을 BACK으로 밀 수 있다', () => {
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const result = pushUnit(enemy, Position.BACK, 'attacker', 1, 1);

    expect(result.unit.position).toBe(Position.BACK);
    expect(result.events[0].type).toBe('UNIT_PUSHED');
  });
});

describe('타겟 선택', () => {
  beforeEach(() => resetUnitCounter());

  it('ENEMY_FRONT: 적 전열에서 AGI 높은 유닛 선택', () => {
    const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const eFront1 = createUnit(createCharacterDef('EF1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    const eFront2 = createUnit(createCharacterDef('EF2', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    // Lancer AGI:12 > Warrior AGI:8

    const target = selectTarget(player, 'ENEMY_FRONT', [player, eFront1, eFront2]);

    expect(target).not.toBeNull();
    expect(target!.id).toBe(eFront2.id); // Lancer가 AGI 더 높음
  });

  it('ENEMY_BACK: 적 후열 유닛 선택', () => {
    const player = createUnit(createCharacterDef('P', CharacterClass.ASSASSIN), Team.PLAYER, Position.BACK);
    const eBack = createUnit(createCharacterDef('EB', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);
    const eFront = createUnit(createCharacterDef('EF', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

    const target = selectTarget(player, 'ENEMY_BACK', [player, eBack, eFront]);

    expect(target).not.toBeNull();
    expect(target!.id).toBe(eBack.id);
  });

  it('ENEMY_ANY: HP가 가장 낮은 적 선택', () => {
    const player = createUnit(createCharacterDef('P', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1 = createUnit(createCharacterDef('E1', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT); // HP:110
    const e2 = createUnit(createCharacterDef('E2', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);   // HP:75

    const target = selectTarget(player, 'ENEMY_ANY', [player, e1, e2]);

    expect(target!.id).toBe(e2.id); // Archer HP 더 낮음
  });

  it('ALLY_LOWEST_HP: 자기 제외, HP 가장 낮은 아군', () => {
    const p1 = createUnit(createCharacterDef('P1', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT); // HP:140
    const p2 = createUnit(createCharacterDef('P2', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);   // HP:75

    const target = selectTarget(p1, 'ALLY_LOWEST_HP', [p1, p2]);

    expect(target!.id).toBe(p2.id);
  });

  it('대상이 없으면 null 반환', () => {
    const player = createUnit(createCharacterDef('P', CharacterClass.ASSASSIN), Team.PLAYER, Position.BACK);

    // 적 후열에 아무도 없음
    const target = selectTarget(player, 'ENEMY_BACK', [player]);

    expect(target).toBeNull();
  });

  it('죽은 유닛은 타겟으로 선택되지 않는다', () => {
    const player = createUnit(createCharacterDef('P', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
    enemy.isAlive = false;

    const target = selectTarget(player, 'ENEMY_FRONT', [player, enemy]);
    expect(target).toBeNull();
  });
});
