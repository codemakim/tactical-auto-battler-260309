import { describe, it, expect, beforeEach } from 'vitest';
import { heroDecide } from '../systems/HeroAI';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, HeroType, AbilityCategory, AbilityType } from '../types';
import type { BattleState, HeroAbility } from '../types';
import { HERO_DEFINITIONS } from '../data/HeroDefinitions';

function makeBattleState(heroType: string, units: ReturnType<typeof createUnit>[]): BattleState {
  const def = HERO_DEFINITIONS[heroType];
  return {
    units,
    hero: {
      heroType: heroType as any,
      interventionsRemaining: 1,
      maxInterventionsPerRound: 1,
      abilities: def?.abilities ?? [],
    },
    round: 1,
    turn: 1,
    turnOrder: units.filter((u) => u.isAlive).map((u) => u.id),
    phase: BattlePhase.TURN_START,
    events: [],
    delayedEffects: [],
    isFinished: false,
    winner: null,
    seed: 42,
  };
}

describe('HeroAI 결정 로직', () => {
  beforeEach(() => resetUnitCounter());

  describe('COMMANDER', () => {
    it('아군 HP 40% 이하 → Shield Order 선택', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      ally.stats.hp = Math.floor(ally.stats.maxHp * 0.3); // 30%

      const state = makeBattleState(HeroType.COMMANDER, [ally, enemy]);
      const decision = heroDecide(state);

      expect(decision).not.toBeNull();
      expect(decision!.ability.id).toBe('commander_shield_order');
      expect(decision!.targetId).toBe(ally.id);
    });

    it('아군 HP 충분 → Rally 선택 (ATK 높은 아군)', () => {
      const tank = createUnit(createCharacterDef('T', CharacterClass.GUARDIAN), Team.PLAYER, Position.FRONT);
      const dps = createUnit(createCharacterDef('D', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

      const state = makeBattleState(HeroType.COMMANDER, [tank, dps, enemy]);
      const decision = heroDecide(state);

      expect(decision).not.toBeNull();
      expect(decision!.ability.id).toBe('commander_rally');
      // ATK 높은 쪽 선택
      const higherAtk = tank.stats.atk > dps.stats.atk ? tank : dps;
      expect(decision!.targetId).toBe(higherAtk.id);
    });
  });

  describe('MAGE', () => {
    it('적 HP 30% 이하 → Fireball 마무리', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      enemy.stats.hp = Math.floor(enemy.stats.maxHp * 0.2); // 20%

      const state = makeBattleState(HeroType.MAGE, [ally, enemy]);
      const decision = heroDecide(state);

      expect(decision).not.toBeNull();
      expect(decision!.ability.id).toBe('mage_fireball');
      expect(decision!.targetId).toBe(enemy.id);
    });

    it('적 HP 충분 → Weaken (ATK 높은 적)', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const weak = createUnit(createCharacterDef('W', CharacterClass.ARCHER), Team.ENEMY, Position.BACK);
      const strong = createUnit(createCharacterDef('S', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

      const state = makeBattleState(HeroType.MAGE, [ally, weak, strong]);
      const decision = heroDecide(state);

      expect(decision).not.toBeNull();
      expect(decision!.ability.id).toBe('mage_weaken');
      const higherAtk = weak.stats.atk > strong.stats.atk ? weak : strong;
      expect(decision!.targetId).toBe(higherAtk.id);
    });
  });

  describe('SUPPORT', () => {
    it('아군 HP 50% 이하 → Heal', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
      ally.stats.hp = Math.floor(ally.stats.maxHp * 0.3);

      const state = makeBattleState(HeroType.SUPPORT, [ally, enemy]);
      const decision = heroDecide(state);

      expect(decision).not.toBeNull();
      expect(decision!.ability.id).toBe('support_heal');
      expect(decision!.targetId).toBe(ally.id);
    });

    it('아군 HP 충분 → Haste', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

      const state = makeBattleState(HeroType.SUPPORT, [ally, enemy]);
      const decision = heroDecide(state);

      expect(decision).not.toBeNull();
      expect(decision!.ability.id).toBe('support_haste');
    });
  });

  describe('공통', () => {
    it('개입 횟수 0이면 null 반환', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

      const state = makeBattleState(HeroType.COMMANDER, [ally, enemy]);
      state.hero.interventionsRemaining = 0;
      const decision = heroDecide(state);

      expect(decision).toBeNull();
    });

    it('이미 큐에 능력이 있으면 null 반환', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
      const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);

      const state = makeBattleState(HeroType.COMMANDER, [ally, enemy]);
      state.hero.queuedAbility = state.hero.abilities[1]; // Rally
      const decision = heroDecide(state);

      expect(decision).toBeNull();
    });

    it('전투 종료 시 null 반환', () => {
      const ally = createUnit(createCharacterDef('A', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

      const state = makeBattleState(HeroType.COMMANDER, [ally]);
      state.isFinished = true;
      const decision = heroDecide(state);

      expect(decision).toBeNull();
    });
  });
});
