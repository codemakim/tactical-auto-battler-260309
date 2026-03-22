/**
 * 교착 방지 시스템 (§22.1~§22.3) 테스트
 * "관리자의 진노" — DAMAGE 수단 상실 시 카운트다운 → 강제 패배
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { createBattleState, stepBattle, runFullBattle } from '../core/BattleEngine';
import { startRound } from '../core/RoundManager';
import { hasAnyDamageCapability, checkStalemate } from '../systems/StalemateDetector';
import { Team, Position, BattlePhase, CharacterClass } from '../types';
import type { BattleUnit, ActionSlot, BattleState } from '../types';

beforeEach(() => resetUnitCounter());

// 헬퍼: 순수 방어 슬롯만 가진 유닛 생성
function makeDefenseOnlyUnit(name: string, team: Team, position: Position): BattleUnit {
  const unit = createUnit(createCharacterDef(name, CharacterClass.GUARDIAN), team, position);
  // 모든 슬롯을 SHIELD 전용으로 교체
  const shieldSlot: ActionSlot = {
    slotIndex: 0,
    condition: { type: 'ALWAYS' as any },
    action: {
      name: 'Shield Only',
      effects: [{ type: 'SHIELD', value: 1.0 }],
      target: { side: 'SELF' },
    },
  };
  return {
    ...unit,
    actionSlots: [
      { ...shieldSlot, slotIndex: 0 },
      { ...shieldSlot, slotIndex: 1 },
      { ...shieldSlot, slotIndex: 2 },
    ],
  };
}

// 헬퍼: 공격 슬롯을 가진 유닛 생성
function makeAttackerUnit(name: string, team: Team, position: Position): BattleUnit {
  return createUnit(createCharacterDef(name, CharacterClass.WARRIOR), team, position);
}

describe('hasAnyDamageCapability', () => {
  it('DAMAGE 효과가 있는 유닛이 있으면 true', () => {
    const attacker = makeAttackerUnit(CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    expect(hasAnyDamageCapability([attacker, enemy])).toBe(true);
  });

  it('플레이어 유닛에 DAMAGE 효과가 없으면 false', () => {
    const defender = makeDefenseOnlyUnit(CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    // 적에게 DAMAGE가 있어도 플레이어 기준이므로 false
    expect(hasAnyDamageCapability([defender, enemy])).toBe(false);
  });

  it('죽은 유닛의 DAMAGE는 무시', () => {
    const deadAttacker = { ...makeAttackerUnit('Dead', Team.PLAYER, Position.FRONT), isAlive: false, currentHp: 0 };
    const defender = makeDefenseOnlyUnit(CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    expect(hasAnyDamageCapability([deadAttacker, defender])).toBe(false);
  });

  it('플레이어 유닛이 없으면 false', () => {
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    expect(hasAnyDamageCapability([enemy])).toBe(false);
  });
});

describe('checkStalemate', () => {
  function makeBaseState(playerUnits: BattleUnit[], enemyUnits: BattleUnit[]): BattleState {
    return createBattleState(playerUnits, enemyUnits, [], []);
  }

  it('DAMAGE 수단이 있으면 교착 아님 — 변화 없음', () => {
    const attacker = makeAttackerUnit(CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    const state = { ...makeBaseState([attacker], [enemy]), round: 1, turn: 0 };

    const result = checkStalemate(state);
    expect(result.events).toHaveLength(0);
    expect(result.state.stalemateCountdown).toBeUndefined();
  });

  it('DAMAGE 수단 상실 시 카운트다운 3 시작 + OVERSEER_WRATH_WARNING 이벤트', () => {
    const defender = makeDefenseOnlyUnit(CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    const state = { ...makeBaseState([defender], [enemy]), round: 1, turn: 0 };

    const result = checkStalemate(state);
    expect(result.state.stalemateCountdown).toBe(3);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('OVERSEER_WRATH_WARNING');
    expect(result.events[0].data.countdown).toBe(3);
  });

  it('카운트다운 진행: 3→2→1→0(강제 패배)', () => {
    const defender = makeDefenseOnlyUnit(CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    const state = { ...makeBaseState([defender], [enemy]), round: 2, turn: 0 };

    // 카운트다운 3 → 2
    const r1 = checkStalemate({ ...state, stalemateCountdown: 3 });
    expect(r1.state.stalemateCountdown).toBe(2);
    expect(r1.events[0].type).toBe('OVERSEER_WRATH_WARNING');
    expect(r1.events[0].data.countdown).toBe(2);

    // 카운트다운 2 → 1
    const r2 = checkStalemate({ ...r1.state, round: 3 });
    expect(r2.state.stalemateCountdown).toBe(1);

    // 카운트다운 1 → 0 (강제 패배)
    const r3 = checkStalemate({ ...r2.state, round: 4 });
    expect(r3.state.stalemateCountdown).toBe(0);
    expect(r3.state.isFinished).toBe(true);
    expect(r3.state.winner).toBe(Team.ENEMY);
    expect(r3.events[0].type).toBe('BATTLE_END');
    expect(r3.events[0].data.reason).toBe('overseer_wrath');
  });

  it('카운트다운 중 DAMAGE 회복 시 해제 + OVERSEER_WRATH_LIFTED 이벤트', () => {
    const attacker = makeAttackerUnit(CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    const state = {
      ...makeBaseState([attacker], [enemy]),
      round: 3,
      turn: 0,
      stalemateCountdown: 2,
    };

    const result = checkStalemate(state);
    expect(result.state.stalemateCountdown).toBeUndefined();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('OVERSEER_WRATH_LIFTED');
  });
});

describe('startRound 통합', () => {
  it('교착 감지 시 startRound에서 카운트다운 설정됨', () => {
    const defender = makeDefenseOnlyUnit(CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    const state = createBattleState([defender], [enemy], [], []);

    const afterRound = startRound(state);
    expect(afterRound.stalemateCountdown).toBe(3);
    const wrathEvents = afterRound.events.filter((e) => e.type === 'OVERSEER_WRATH_WARNING');
    expect(wrathEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('교착 카운트다운이 0에 도달하면 전투 종료', () => {
    const defender = makeDefenseOnlyUnit(CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    let state: BattleState = {
      ...createBattleState([defender], [enemy], [], []),
      stalemateCountdown: 1,
    };

    const afterRound = startRound(state);
    expect(afterRound.isFinished).toBe(true);
    expect(afterRound.winner).toBe(Team.ENEMY);
    expect(afterRound.phase).toBe(BattlePhase.BATTLE_END);
    const endEvents = afterRound.events.filter((e) => e.type === 'BATTLE_END');
    expect(endEvents.length).toBeGreaterThanOrEqual(1);
    expect(endEvents[0].data.reason).toBe('overseer_wrath');
  });
});

describe('runFullBattle 통합', () => {
  it('순수 방어 유닛만 남으면 교착 시스템으로 패배', () => {
    const defender = makeDefenseOnlyUnit(CharacterClass.GUARDIAN, Team.PLAYER, Position.FRONT);
    const enemy = makeAttackerUnit('Enemy', Team.ENEMY, Position.FRONT);
    const state = createBattleState([defender], [enemy], [], []);

    const result = runFullBattle(state);
    expect(result.isFinished).toBe(true);
    expect(result.winner).toBe(Team.ENEMY);
    // 20라운드 최대보다 훨씬 전에 종료되어야 함 (카운트다운 3 + 초기 라운드)
    expect(result.round).toBeLessThanOrEqual(6);
    const wrathEvents = result.events.filter((e) => e.type === 'OVERSEER_WRATH_WARNING' || e.type === 'BATTLE_END');
    expect(wrathEvents.length).toBeGreaterThanOrEqual(2);
  });
});
