import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, runFullBattle } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { resetUid } from '../utils/uid';
import { CharacterClass, Team, Position } from '../types';

describe('결정론적 전투 (Determinism)', () => {
  beforeEach(() => resetUnitCounter());

  it('같은 시드로 두 번 실행하면 동일한 결과를 낸다', () => {
    const seed = 12345;

    // 첫 번째 실행
    resetUnitCounter();
    resetUid();
    const p1a = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2a = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3a = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1a = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2a = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3a = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    const stateA = createBattleState([p1a, p2a, p3a], [e1a, e2a, e3a], [], [], seed);
    const resultA = runFullBattle(stateA);

    // 두 번째 실행
    resetUnitCounter();
    resetUid();
    const p1b = createUnit(createCharacterDef('P-Warrior', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
    const p2b = createUnit(createCharacterDef('P-Guardian', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
    const p3b = createUnit(createCharacterDef('P-Archer', CharacterClass.ARCHER), Team.PLAYER, Position.BACK);
    const e1b = createUnit(createCharacterDef('E-Lancer', CharacterClass.LANCER), Team.ENEMY, Position.FRONT);
    const e2b = createUnit(createCharacterDef('E-Assassin', CharacterClass.ASSASSIN), Team.ENEMY, Position.BACK);
    const e3b = createUnit(createCharacterDef('E-Controller', CharacterClass.CONTROLLER), Team.ENEMY, Position.FRONT);

    const stateB = createBattleState([p1b, p2b, p3b], [e1b, e2b, e3b], [], [], seed);
    const resultB = runFullBattle(stateB);

    // 동일한 승자
    expect(resultA.winner).toBe(resultB.winner);

    // 동일한 라운드 수
    expect(resultA.round).toBe(resultB.round);

    // 동일한 이벤트 수
    expect(resultA.events.length).toBe(resultB.events.length);
  });
});
