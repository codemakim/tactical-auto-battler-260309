import { describe, it, expect, beforeEach } from 'vitest';
import { calculateFullTurnOrder, accelerateUnit, delayUnit } from '../core/TurnOrderManager';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position } from '../types';

describe('턴 순서 시스템', () => {
  beforeEach(() => resetUnitCounter());

  it('AGI가 높은 유닛이 먼저 행동한다', () => {
    // Assassin(AGI:16) > Archer(AGI:14) > Lancer(AGI:12) > Warrior(AGI:8)
    const assassin = createUnit(createCharacterDef('Assassin', CharacterClass.ASSASSIN), Team.PLAYER, Position.BACK);
    const warrior = createUnit(createCharacterDef('Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const archer = createUnit(createCharacterDef('Archer', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);
    const lancer = createUnit(createCharacterDef('Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);

    const order = calculateFullTurnOrder([warrior, assassin, archer, lancer]);

    expect(order[0]).toBe(assassin.id);  // AGI 16
    expect(order[1]).toBe(archer.id);    // AGI 14
    expect(order[2]).toBe(lancer.id);    // AGI 12
    expect(order[3]).toBe(warrior.id);   // AGI 8
  });

  it('피아가 섞여서 행동한다 (AGI 순서대로)', () => {
    const pWarrior = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const eAssassin = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const pArcher = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);

    const order = calculateFullTurnOrder([pWarrior, eAssassin, pArcher]);

    // E-Assassin(16) → P-Archer(14) → P-Warrior(8) : 피아 섞임
    expect(order[0]).toBe(eAssassin.id);
    expect(order[1]).toBe(pArcher.id);
    expect(order[2]).toBe(pWarrior.id);
  });

  it('죽은 유닛은 턴 순서에서 제외된다', () => {
    const alive = createUnit(createCharacterDef('Alive', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const dead = createUnit(createCharacterDef('Dead', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    dead.isAlive = false;

    const order = calculateFullTurnOrder([alive, dead]);

    expect(order).toHaveLength(1);
    expect(order[0]).toBe(alive.id);
  });

  it('턴 가속: 유닛을 2칸 앞으로 당길 수 있다', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    const result = accelerateUnit(order, 'd'); // d를 2칸 앞으로

    expect(result.indexOf('d')).toBeLessThan(order.indexOf('d'));
    expect(result).toContain('d');
    expect(result).toHaveLength(5);
  });

  it('턴 지연: 유닛을 2칸 뒤로 미룰 수 있다', () => {
    const order = ['a', 'b', 'c', 'd', 'e'];
    const result = delayUnit(order, 'b'); // b를 2칸 뒤로

    expect(result.indexOf('b')).toBeGreaterThan(order.indexOf('b'));
    expect(result).toContain('b');
    expect(result).toHaveLength(5);
  });
});
