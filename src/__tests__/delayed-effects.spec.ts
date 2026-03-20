/**
 * 지연 효과(Delayed Effects) 테스트 — §7.2
 *
 * 테스트 구성:
 *   1. 데이터 모델 — DelayedEffect가 BattleState에 저장되는지
 *   2. 생성 — DELAYED 액션 효과 실행 시 delayedEffects에 등록
 *   3. 카운트다운 — 라운드 종료 시 remainingRounds 감소
 *   4. 발동: DAMAGE — 라운드 종료 시 데미지 적용
 *   5. 발동: HEAL — 라운드 종료 시 힐 적용
 *   6. 발동: BUFF — 라운드 종료 시 버프 적용
 *   7. 엣지케이스: 대상 사망 — 이미 죽은 대상에게는 효과 무시
 *   8. 엣지케이스: 소스 사망 — 시전자가 죽어도 효과 발동
 *   9. 엣지케이스: 복수 지연 효과 — 등록 순서대로 독립 해석
 *  10. 이벤트 기록 — DELAYED_EFFECT_APPLIED / RESOLVED 이벤트
 *  11. 통합: 라운드 흐름 — endRound 내 버프틱 → 지연효과 순서 검증
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Team, Position, BattlePhase, BuffType, Target } from '../types';
import type { BattleState, BattleUnit, ActionSlot, DelayedEffect } from '../types';
import { uid, resetUid } from '../utils/uid';
import { endRound } from '../core/RoundManager';
import { resolveDelayedEffects, tickDelayedEffects } from '../systems/DelayedEffectSystem';
import { executeAction } from '../systems/ActionResolver';

// ─── 헬퍼 ───

function makeBattleState(overrides: Partial<BattleState> = {}): BattleState {
  return {
    units: [],
    reserve: [],
    hero: { heroType: 'COMMANDER', interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
    round: 1,
    turn: 1,
    turnOrder: [],
    phase: BattlePhase.ACTION_RESOLVE,
    events: [],
    isFinished: false,
    winner: null,
    seed: 12345,
    delayedEffects: [],
    ...overrides,
  };
}

function makePlayerUnit(name: string, position: Position = Position.FRONT): BattleUnit {
  return createUnit(createCharacterDef(name, CharacterClass.WARRIOR), Team.PLAYER, position);
}

function makeEnemyUnit(name: string, position: Position = Position.FRONT): BattleUnit {
  return createUnit(createCharacterDef(name, CharacterClass.WARRIOR), Team.ENEMY, position);
}

function makeDelayedEffect(overrides: Partial<DelayedEffect> = {}): DelayedEffect {
  return {
    id: uid(),
    sourceId: 'source_1',
    targetId: 'target_1',
    effectType: 'DAMAGE',
    value: 10,
    remainingRounds: 1,
    ...overrides,
  };
}

// ─── 테스트 ───

describe('지연 효과 시스템 (§7.2)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetUid();
  });

  // ═══════════════════════════════════════════
  // 1. 데이터 모델
  // ═══════════════════════════════════════════

  describe('1. 데이터 모델 — BattleState에 delayedEffects 필드', () => {
    it('BattleState에 빈 delayedEffects 배열이 존재한다', () => {
      const state = makeBattleState();
      expect(state.delayedEffects).toBeDefined();
      expect(state.delayedEffects).toEqual([]);
    });

    it('DelayedEffect 객체가 올바른 필드를 가진다', () => {
      const effect = makeDelayedEffect({
        id: 'de_1',
        sourceId: 'unit_a',
        targetId: 'unit_b',
        effectType: 'DAMAGE',
        value: 15,
        remainingRounds: 2,
      });

      expect(effect.id).toBe('de_1');
      expect(effect.sourceId).toBe('unit_a');
      expect(effect.targetId).toBe('unit_b');
      expect(effect.effectType).toBe('DAMAGE');
      expect(effect.value).toBe(15);
      expect(effect.remainingRounds).toBe(2);
    });

    it('BUFF 타입 DelayedEffect는 buffType과 buffDuration을 가진다', () => {
      const effect = makeDelayedEffect({
        effectType: 'BUFF',
        value: 5,
        buffType: BuffType.ATK_UP,
        buffDuration: 3,
      });

      expect(effect.effectType).toBe('BUFF');
      expect(effect.buffType).toBe(BuffType.ATK_UP);
      expect(effect.buffDuration).toBe(3);
    });
  });

  // ═══════════════════════════════════════════
  // 2. 생성 — DELAYED 액션 효과 실행
  // ═══════════════════════════════════════════

  describe('2. 생성 — DELAYED 액션 효과가 delayedEffects에 등록', () => {
    it('DELAYED 타입 액션 효과 실행 시 BattleState.delayedEffects에 추가된다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');

      const delayedSlot: ActionSlot = {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'time_bomb',
          name: 'Time Bomb',
          description: 'Deal damage after 2 rounds',
          effects: [
            {
              type: 'DELAYED',
              value: 20,
              target: Target.ENEMY_FRONT,
              delayedType: 'DAMAGE',
              delayRounds: 2,
            },
          ],
        },
      };

      const state = makeBattleState({
        units: [player, enemy],
        turnOrder: [player.id, enemy.id],
        delayedEffects: [],
      });

      const result = executeAction(player, delayedSlot, state);

      expect(result.delayedEffects).toBeDefined();
      expect(result.delayedEffects).toHaveLength(1);
      expect(result.delayedEffects![0].effectType).toBe('DAMAGE');
      expect(result.delayedEffects![0].value).toBe(20);
      expect(result.delayedEffects![0].remainingRounds).toBe(2);
      expect(result.delayedEffects![0].targetId).toBe(enemy.id);
      expect(result.delayedEffects![0].sourceId).toBe(player.id);
    });

    it('DELAYED HEAL 효과가 정상적으로 등록된다', () => {
      const player = makePlayerUnit('Healer');
      const ally = makePlayerUnit('Ally');
      // Ally의 HP를 깎아둠
      ally.stats.hp = ally.stats.maxHp - 20;

      const delayedHealSlot: ActionSlot = {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'delayed_heal',
          name: 'Delayed Heal',
          description: 'Heal ally after 1 round',
          effects: [
            {
              type: 'DELAYED',
              value: 15,
              target: Target.ALLY_LOWEST_HP,
              delayedType: 'HEAL',
              delayRounds: 1,
            },
          ],
        },
      };

      const enemy = makeEnemyUnit('Enemy');
      const state = makeBattleState({
        units: [player, ally, enemy],
        turnOrder: [player.id, ally.id, enemy.id],
      });

      const result = executeAction(player, delayedHealSlot, state);

      expect(result.delayedEffects).toHaveLength(1);
      expect(result.delayedEffects![0].effectType).toBe('HEAL');
      expect(result.delayedEffects![0].targetId).toBe(ally.id);
    });

    it('DELAYED BUFF 효과가 buffType, buffDuration과 함께 등록된다', () => {
      const player = makePlayerUnit('Buffer');
      const enemy = makeEnemyUnit('Enemy');

      const delayedBuffSlot: ActionSlot = {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'delayed_debuff',
          name: 'Curse',
          description: 'Debuff enemy after 1 round',
          effects: [
            {
              type: 'DELAYED',
              value: 4,
              target: Target.ENEMY_FRONT,
              delayedType: 'BUFF',
              delayRounds: 1,
              buffType: BuffType.ATK_DOWN,
              duration: 2,
            },
          ],
        },
      };

      const state = makeBattleState({
        units: [player, enemy],
        turnOrder: [player.id, enemy.id],
      });

      const result = executeAction(player, delayedBuffSlot, state);

      expect(result.delayedEffects).toHaveLength(1);
      const de = result.delayedEffects![0];
      expect(de.effectType).toBe('BUFF');
      expect(de.buffType).toBe(BuffType.ATK_DOWN);
      expect(de.buffDuration).toBe(2);
    });

    it('생성 시 DELAYED_EFFECT_APPLIED 이벤트가 기록된다', () => {
      const player = makePlayerUnit('Caster');
      const enemy = makeEnemyUnit('Target');

      const slot: ActionSlot = {
        condition: { type: 'ALWAYS' },
        action: {
          id: 'time_bomb',
          name: 'Time Bomb',
          description: 'Delayed damage',
          effects: [
            {
              type: 'DELAYED',
              value: 10,
              target: Target.ENEMY_FRONT,
              delayedType: 'DAMAGE',
              delayRounds: 2,
            },
          ],
        },
      };

      const state = makeBattleState({
        units: [player, enemy],
        turnOrder: [player.id, enemy.id],
      });

      const result = executeAction(player, slot, state);

      const appliedEvent = result.events.find((e) => e.type === 'DELAYED_EFFECT_APPLIED');
      expect(appliedEvent).toBeDefined();
      expect(appliedEvent!.sourceId).toBe(player.id);
      expect(appliedEvent!.targetId).toBe(enemy.id);
      expect(appliedEvent!.data?.effectType).toBe('DAMAGE');
      expect(appliedEvent!.data?.value).toBe(10);
      expect(appliedEvent!.data?.delayRounds).toBe(2);
    });
  });

  // ═══════════════════════════════════════════
  // 3. 카운트다운 — 라운드 종료 시 remainingRounds 감소
  // ═══════════════════════════════════════════

  describe('3. 카운트다운 — remainingRounds 감소', () => {
    it('tickDelayedEffects가 remainingRounds를 1 감소시킨다', () => {
      const effect = makeDelayedEffect({ remainingRounds: 3 });
      const result = tickDelayedEffects([effect]);

      expect(result.remaining[0].remainingRounds).toBe(2);
      expect(result.resolved).toHaveLength(0);
    });

    it('remainingRounds가 1이면 카운트다운 후 resolved에 포함된다', () => {
      const effect = makeDelayedEffect({ remainingRounds: 1 });
      const result = tickDelayedEffects([effect]);

      expect(result.remaining).toHaveLength(0);
      expect(result.resolved).toHaveLength(1);
      expect(result.resolved[0].id).toBe(effect.id);
    });

    it('여러 효과 중 일부만 발동 시점에 도달한다', () => {
      const effect1 = makeDelayedEffect({ id: 'de_1', remainingRounds: 1 });
      const effect2 = makeDelayedEffect({ id: 'de_2', remainingRounds: 3 });
      const effect3 = makeDelayedEffect({ id: 'de_3', remainingRounds: 1 });

      const result = tickDelayedEffects([effect1, effect2, effect3]);

      expect(result.resolved).toHaveLength(2);
      expect(result.resolved.map((e) => e.id)).toEqual(['de_1', 'de_3']);
      expect(result.remaining).toHaveLength(1);
      expect(result.remaining[0].id).toBe('de_2');
      expect(result.remaining[0].remainingRounds).toBe(2);
    });
  });

  // ═══════════════════════════════════════════
  // 4. 발동: DAMAGE — 라운드 종료 시 데미지 적용
  // ═══════════════════════════════════════════

  describe('4. 발동: DAMAGE — 대상에게 데미지 적용', () => {
    it('DAMAGE 지연 효과가 발동하면 대상의 HP가 감소한다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');
      const hpBefore = enemy.stats.hp;

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.stats.hp).toBe(hpBefore - 10);
    });

    it('DAMAGE 지연 효과로 대상이 사망할 수 있다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');
      enemy.stats.hp = 5; // 낮은 HP

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.stats.hp).toBe(0);
      expect(target.isAlive).toBe(false);

      // UNIT_DIED 이벤트 확인
      const deathEvent = result.events.find((e) => e.type === 'UNIT_DIED');
      expect(deathEvent).toBeDefined();
      expect(deathEvent!.targetId).toBe(enemy.id);
    });

    it('DAMAGE 지연 효과는 shield를 먼저 소모한다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');
      enemy.shield = 6;
      const hpBefore = enemy.stats.hp;

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.shield).toBe(0);
      // 10 damage - 6 shield = 4 damage to HP
      expect(target.stats.hp).toBe(hpBefore - 4);
    });
  });

  // ═══════════════════════════════════════════
  // 5. 발동: HEAL — 라운드 종료 시 힐 적용
  // ═══════════════════════════════════════════

  describe('5. 발동: HEAL — 대상에게 힐 적용', () => {
    it('HEAL 지연 효과가 발동하면 대상의 HP가 회복된다', () => {
      const player = makePlayerUnit('Healer');
      player.stats.hp = player.stats.maxHp - 15;
      const hpBefore = player.stats.hp;

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: player.id,
        effectType: 'HEAL',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === player.id)!;
      expect(target.stats.hp).toBe(hpBefore + 10);
    });

    it('HEAL은 maxHp를 초과하지 않는다', () => {
      const player = makePlayerUnit('Healer');
      player.stats.hp = player.stats.maxHp - 3; // 3만 부족

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: player.id,
        effectType: 'HEAL',
        value: 20, // 20 힐하려 하지만
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === player.id)!;
      expect(target.stats.hp).toBe(target.stats.maxHp);
    });
  });

  // ═══════════════════════════════════════════
  // 6. 발동: BUFF — 라운드 종료 시 버프 적용
  // ═══════════════════════════════════════════

  describe('6. 발동: BUFF — 대상에게 버프 적용', () => {
    it('BUFF 지연 효과가 발동하면 대상에게 버프가 추가된다', () => {
      const player = makePlayerUnit('Buffer');
      const enemy = makeEnemyUnit('Target');

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'BUFF',
        value: 5,
        remainingRounds: 1,
        buffType: BuffType.GUARD_DOWN,
        buffDuration: 2,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.buffs).toHaveLength(1);
      expect(target.buffs[0].type).toBe(BuffType.GUARD_DOWN);
      expect(target.buffs[0].value).toBe(5);
      expect(target.buffs[0].duration).toBe(2);
    });

    it('BUFF 지연 효과의 sourceId가 올바르게 전달된다', () => {
      const player = makePlayerUnit('Buffer');
      const ally = makePlayerUnit('Ally');

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: ally.id,
        effectType: 'BUFF',
        value: 3,
        remainingRounds: 1,
        buffType: BuffType.ATK_UP,
        buffDuration: 3,
      });

      const state = makeBattleState({
        units: [player, ally],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === ally.id)!;
      expect(target.buffs[0].sourceId).toBe(player.id);
    });
  });

  // ═══════════════════════════════════════════
  // 7. 엣지케이스: 대상 사망
  // ═══════════════════════════════════════════

  describe('7. 엣지케이스: 대상이 이미 사망한 경우', () => {
    it('대상이 이미 죽었으면 DAMAGE 효과가 무시된다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');
      enemy.isAlive = false;
      enemy.stats.hp = 0;

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      // HP 변동 없음
      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.stats.hp).toBe(0);

      // RESOLVED 이벤트에 skipped 표시
      const resolvedEvent = result.events.find((e) => e.type === 'DELAYED_EFFECT_RESOLVED');
      expect(resolvedEvent).toBeDefined();
      expect(resolvedEvent!.data?.skipped).toBe(true);
      expect(resolvedEvent!.data?.reason).toBe('target_dead');
    });

    it('대상이 이미 죽었으면 HEAL 효과가 무시된다', () => {
      const player = makePlayerUnit('Healer');
      player.isAlive = false;
      player.stats.hp = 0;

      const effect = makeDelayedEffect({
        sourceId: 'some_source',
        targetId: player.id,
        effectType: 'HEAL',
        value: 15,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === player.id)!;
      expect(target.stats.hp).toBe(0);
      expect(target.isAlive).toBe(false);
    });

    it('대상이 이미 죽었으면 BUFF 효과가 무시된다', () => {
      const enemy = makeEnemyUnit('Target');
      enemy.isAlive = false;
      enemy.stats.hp = 0;

      const effect = makeDelayedEffect({
        targetId: enemy.id,
        effectType: 'BUFF',
        value: 5,
        remainingRounds: 1,
        buffType: BuffType.ATK_DOWN,
        buffDuration: 2,
      });

      const state = makeBattleState({
        units: [enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.buffs).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════
  // 8. 엣지케이스: 소스 사망
  // ═══════════════════════════════════════════

  describe('8. 엣지케이스: 시전자가 사망해도 효과는 발동', () => {
    it('소스 유닛이 죽어도 DAMAGE 지연 효과는 정상 발동한다', () => {
      const player = makePlayerUnit('DeadAttacker');
      player.isAlive = false;
      player.stats.hp = 0;

      const enemy = makeEnemyUnit('Target');
      const hpBefore = enemy.stats.hp;

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 12,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.stats.hp).toBe(hpBefore - 12);
    });
  });

  // ═══════════════════════════════════════════
  // 9. 엣지케이스: 복수 지연 효과
  // ═══════════════════════════════════════════

  describe('9. 복수 지연 효과 — 등록 순서대로 독립 해석', () => {
    it('같은 대상에 대한 복수 DAMAGE가 순서대로 모두 적용된다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');
      const hpBefore = enemy.stats.hp;

      const effect1 = makeDelayedEffect({
        id: 'de_first',
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 5,
        remainingRounds: 1,
      });
      const effect2 = makeDelayedEffect({
        id: 'de_second',
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 8,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect1, effect2],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.stats.hp).toBe(hpBefore - 5 - 8);
    });

    it('첫 번째 DAMAGE로 사망하면 두 번째 DAMAGE는 무시된다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');
      enemy.stats.hp = 7;

      const effect1 = makeDelayedEffect({
        id: 'de_kill',
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });
      const effect2 = makeDelayedEffect({
        id: 'de_overkill',
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 20,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect1, effect2],
      });

      const result = resolveDelayedEffects(state);

      const target = result.state.units.find((u) => u.id === enemy.id)!;
      expect(target.isAlive).toBe(false);
      expect(target.stats.hp).toBe(0);

      // 두 번째 효과는 skipped
      const resolvedEvents = result.events.filter((e) => e.type === 'DELAYED_EFFECT_RESOLVED');
      expect(resolvedEvents).toHaveLength(2);
      expect(resolvedEvents[1].data?.skipped).toBe(true);
      expect(resolvedEvents[1].data?.reason).toBe('target_dead');
    });

    it('서로 다른 대상에 대한 효과는 각각 독립적으로 적용된다', () => {
      const player = makePlayerUnit('Caster');
      const enemy1 = makeEnemyUnit('Target1');
      const enemy2 = makeEnemyUnit('Target2');
      const hp1Before = enemy1.stats.hp;
      const hp2Before = enemy2.stats.hp;

      const effect1 = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy1.id,
        effectType: 'DAMAGE',
        value: 7,
        remainingRounds: 1,
      });
      const effect2 = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy2.id,
        effectType: 'HEAL',
        value: 999, // 큰 값이지만 maxHp 제한
        remainingRounds: 1,
      });

      // enemy2의 HP를 살짝 깎아두기 (HEAL 테스트를 위해)
      enemy2.stats.hp = enemy2.stats.maxHp - 5;
      const hp2Damaged = enemy2.stats.hp;

      const state = makeBattleState({
        units: [player, enemy1, enemy2],
        delayedEffects: [effect1, effect2],
      });

      const result = resolveDelayedEffects(state);

      const t1 = result.state.units.find((u) => u.id === enemy1.id)!;
      const t2 = result.state.units.find((u) => u.id === enemy2.id)!;

      expect(t1.stats.hp).toBe(hp1Before - 7);
      expect(t2.stats.hp).toBe(t2.stats.maxHp); // maxHp까지만 회복
    });
  });

  // ═══════════════════════════════════════════
  // 10. 이벤트 기록
  // ═══════════════════════════════════════════

  describe('10. 이벤트 기록 — DELAYED_EFFECT_RESOLVED', () => {
    it('발동 시 DELAYED_EFFECT_RESOLVED 이벤트가 기록된다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');

      const effect = makeDelayedEffect({
        id: 'de_test',
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const resolvedEvent = result.events.find((e) => e.type === 'DELAYED_EFFECT_RESOLVED');
      expect(resolvedEvent).toBeDefined();
      expect(resolvedEvent!.sourceId).toBe(player.id);
      expect(resolvedEvent!.targetId).toBe(enemy.id);
      expect(resolvedEvent!.data?.delayedEffectId).toBe('de_test');
      expect(resolvedEvent!.data?.effectType).toBe('DAMAGE');
      expect(resolvedEvent!.data?.value).toBe(10);
    });

    it('DAMAGE 발동 시 DAMAGE_DEALT 이벤트도 함께 기록된다', () => {
      const player = makePlayerUnit('Attacker');
      const enemy = makeEnemyUnit('Target');

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const dmgEvent = result.events.find((e) => e.type === 'DAMAGE_DEALT');
      expect(dmgEvent).toBeDefined();
      expect(dmgEvent!.targetId).toBe(enemy.id);
      expect(dmgEvent!.value).toBe(10);
    });

    it('HEAL 발동 시 HEAL_APPLIED 이벤트도 함께 기록된다', () => {
      const player = makePlayerUnit('Healer');
      player.stats.hp = player.stats.maxHp - 10;

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: player.id,
        effectType: 'HEAL',
        value: 8,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      const healEvent = result.events.find((e) => e.type === 'HEAL_APPLIED');
      expect(healEvent).toBeDefined();
      expect(healEvent!.targetId).toBe(player.id);
    });

    it('BUFF 발동 시 BUFF_APPLIED 또는 DEBUFF_APPLIED 이벤트도 기록된다', () => {
      const player = makePlayerUnit('Buffer');
      const enemy = makeEnemyUnit('Target');

      const effect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'BUFF',
        value: 3,
        remainingRounds: 1,
        buffType: BuffType.POISON,
        buffDuration: 2,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [effect],
      });

      const result = resolveDelayedEffects(state);

      // POISON은 디버프
      const debuffEvent = result.events.find((e) => e.type === 'DEBUFF_APPLIED');
      expect(debuffEvent).toBeDefined();
      expect(debuffEvent!.targetId).toBe(enemy.id);
    });
  });

  // ═══════════════════════════════════════════
  // 11. 통합: endRound 흐름에서 지연 효과 처리
  // ═══════════════════════════════════════════

  describe('11. 통합 — endRound 내 처리 순서', () => {
    it('endRound에서 버프 틱 → 지연 효과 순서로 처리된다', () => {
      const player = makePlayerUnit('Player');
      const enemy = makeEnemyUnit('Enemy');
      const hpBefore = enemy.stats.hp;

      // 1라운드 남은 지연 효과
      const delayedEffect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [delayedEffect],
      });

      const result = endRound(state);

      // 지연 효과가 처리되었는지 확인
      const target = result.units.find((u) => u.id === enemy.id)!;
      expect(target.stats.hp).toBe(hpBefore - 10);

      // delayedEffects가 비었는지 확인
      expect(result.delayedEffects).toHaveLength(0);
    });

    it('endRound에서 remainingRounds > 1인 효과는 유지된다', () => {
      const player = makePlayerUnit('Player');
      const enemy = makeEnemyUnit('Enemy');

      const delayedEffect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 10,
        remainingRounds: 3,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [delayedEffect],
      });

      const result = endRound(state);

      // HP 변동 없음
      const target = result.units.find((u) => u.id === enemy.id)!;
      expect(target.stats.hp).toBe(enemy.stats.hp);

      // 효과가 남아있고 remainingRounds 감소됨
      expect(result.delayedEffects).toHaveLength(1);
      expect(result.delayedEffects[0].remainingRounds).toBe(2);
    });

    it('endRound에서 버프 틱과 지연 효과가 모두 정상 처리된다', () => {
      const player = makePlayerUnit('Player');
      const enemy = makeEnemyUnit('Enemy');

      // 적에게 1라운드 남은 ATK_DOWN 버프
      enemy.buffs = [
        {
          id: 'buff_1',
          type: BuffType.ATK_DOWN,
          value: 3,
          duration: 1,
          sourceId: player.id,
        },
      ];

      // 1라운드 남은 지연 데미지
      const delayedEffect = makeDelayedEffect({
        sourceId: player.id,
        targetId: enemy.id,
        effectType: 'DAMAGE',
        value: 8,
        remainingRounds: 1,
      });

      const state = makeBattleState({
        units: [player, enemy],
        delayedEffects: [delayedEffect],
      });

      const result = endRound(state);

      const target = result.units.find((u) => u.id === enemy.id)!;

      // 버프 만료됨
      expect(target.buffs).toHaveLength(0);

      // 지연 데미지 적용됨
      expect(target.stats.hp).toBe(enemy.stats.hp - 8);

      // 지연 효과 배열 비움
      expect(result.delayedEffects).toHaveLength(0);

      // 이벤트 순서: BUFF_EXPIRED → DELAYED_EFFECT_RESOLVED → ROUND_END
      const eventTypes = result.events.map((e) => e.type);
      const buffExpiredIdx = eventTypes.indexOf('BUFF_EXPIRED');
      const resolvedIdx = eventTypes.indexOf('DELAYED_EFFECT_RESOLVED');
      const roundEndIdx = eventTypes.indexOf('ROUND_END');

      expect(buffExpiredIdx).toBeLessThan(resolvedIdx);
      expect(resolvedIdx).toBeLessThan(roundEndIdx);
    });
  });
});
