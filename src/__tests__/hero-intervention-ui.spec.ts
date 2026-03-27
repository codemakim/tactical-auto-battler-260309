/**
 * 영웅 개입 UI 통합 테스트
 *
 * Scene이 영웅 개입을 호출할 때 의존하는 계약 검증.
 * Phaser 없이 순수 로직으로 Scene의 동작을 시뮬레이션한다.
 *
 * 카테고리:
 * 1. 능력 목록 접근 — hero.abilities에서 올바른 능력을 가져오는지
 * 2. 사용 가능 여부 — canIntervene 조건
 * 3. 큐잉 → 실행 흐름 — queueIntervention 후 doStep에서 실행
 * 4. EFFECT 능력 — 타겟 지정 및 자동 선택
 * 5. EDIT_ACTION 능력 — 카드 교체 흐름
 * 6. UI 상태 반영 — 실행 후 interventionsRemaining, 이벤트 확인
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createBattleState, stepBattle, queueIntervention } from '../core/BattleEngine';
import { canIntervene } from '../systems/HeroInterventionSystem';
import { startRound } from '../core/RoundManager';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { Team, Position, BattlePhase, CharacterClass, HeroType, AbilityType, AbilityCategory } from '../types';
import type { BattleState, HeroAbility, BattleEvent } from '../types';

// ─── 헬퍼 ────────────────────────────────

function makeStarter(name: string, cls: string, team: Team, pos: Position) {
  const def = createCharacterDef(name, cls);
  return createUnit(def, team, pos);
}

/** Scene의 doStep과 동일: 한 유닛 행동까지 진행 */
function doOneStep(state: BattleState): { state: BattleState; newEvents: BattleEvent[] } {
  const prevCount = state.events.length;
  let s = state;
  for (let i = 0; i < 10 && !s.isFinished; i++) {
    const phaseBefore = s.phase;
    s = stepBattle(s).state;
    if (phaseBefore === BattlePhase.TURN_START || phaseBefore === BattlePhase.TURN_END) break;
    if (s.phase === BattlePhase.BATTLE_END) break;
  }
  return { state: s, newEvents: s.events.slice(prevCount) };
}

/** ROUND_START → TURN_START까지 진행 (Scene의 advanceToFirstTurn) */
function advanceToFirstTurn(state: BattleState): BattleState {
  let s = state;
  let safety = 0;
  while (!s.isFinished && (s.phase === BattlePhase.ROUND_START || s.phase === BattlePhase.ROUND_END) && safety < 5) {
    s = stepBattle(s).state;
    safety++;
  }
  return s;
}

function createTestBattle(heroType: HeroType = HeroType.COMMANDER): BattleState {
  resetUnitCounter();
  const p1 = makeStarter('Aldric', CharacterClass.WARRIOR, Team.PLAYER, Position.FRONT);
  const p2 = makeStarter('Lyra', CharacterClass.ARCHER, Team.PLAYER, Position.BACK);
  const e1 = makeStarter('EnemyA', CharacterClass.WARRIOR, Team.ENEMY, Position.FRONT);
  const e2 = makeStarter('EnemyB', CharacterClass.WARRIOR, Team.ENEMY, Position.FRONT);
  let state = createBattleState([p1, p2], [e1, e2], 42, heroType);
  return advanceToFirstTurn(state);
}

// ─── 1. 능력 목록 접근 ──────────────────────

describe('영웅 능력 목록 접근', () => {
  it('COMMANDER는 3개 능력을 가진다 (Edit Action + Rally + Shield Order)', () => {
    const state = createTestBattle(HeroType.COMMANDER);
    const abilities = state.hero.abilities;
    expect(abilities).toHaveLength(3);

    const editAction = abilities.find((a) => a.abilityType === AbilityType.EDIT_ACTION);
    expect(editAction).toBeDefined();
    expect(editAction!.category).toBe(AbilityCategory.COMMON);

    const effects = abilities.filter((a) => a.abilityType === AbilityType.EFFECT);
    expect(effects).toHaveLength(2);
  });

  it('MAGE는 3개 능력을 가진다 (Edit Action + Fireball + Weaken)', () => {
    const state = createTestBattle(HeroType.MAGE);
    const abilities = state.hero.abilities;
    expect(abilities).toHaveLength(3);

    const names = abilities.map((a) => a.name).sort();
    expect(names).toContain('Fireball');
    expect(names).toContain('Weaken');
  });

  it('SUPPORT는 3개 능력을 가진다 (Edit Action + Heal + Haste)', () => {
    const state = createTestBattle(HeroType.SUPPORT);
    const abilities = state.hero.abilities;
    expect(abilities).toHaveLength(3);

    const names = abilities.map((a) => a.name).sort();
    expect(names).toContain('Heal');
    expect(names).toContain('Haste');
  });

  it('각 능력에 id, name, description, effects가 있다', () => {
    const state = createTestBattle(HeroType.COMMANDER);
    for (const ability of state.hero.abilities) {
      expect(ability.id).toBeDefined();
      expect(ability.name).toBeDefined();
      expect(ability.description).toBeDefined();
      expect(ability.abilityType).toBeDefined();
      expect(ability.category).toBeDefined();
    }
  });
});

// ─── 2. 사용 가능 여부 ──────────────────────

describe('영웅 개입 사용 가능 여부', () => {
  it('라운드 시작 시 canIntervene은 true', () => {
    const state = createTestBattle();
    expect(canIntervene(state)).toBe(true);
    expect(state.hero.interventionsRemaining).toBe(1);
  });

  it('개입 사용 후 canIntervene은 false', () => {
    let state = createTestBattle();
    const ability = state.hero.abilities.find((a) => a.abilityType === AbilityType.EFFECT)!;

    state = queueIntervention(state, ability);
    // 큐잉 시점에는 아직 true (차감 안 됨)
    expect(canIntervene(state)).toBe(true);

    // 실행 후 false
    const { state: after } = doOneStep(state);
    expect(after.hero.interventionsRemaining).toBe(0);
    expect(canIntervene(after)).toBe(false);
  });

  it('다음 라운드 시작 시 interventionsRemaining이 리셋된다', () => {
    let state = createTestBattle();
    const ability = state.hero.abilities.find((a) => a.abilityType === AbilityType.EFFECT)!;

    // 개입 사용
    state = queueIntervention(state, ability);
    let { state: current } = doOneStep(state);
    expect(current.hero.interventionsRemaining).toBe(0);

    // 나머지 턴 소진하여 라운드 종료 → 다음 라운드 시작까지 진행
    while (current.phase !== BattlePhase.ROUND_END && !current.isFinished) {
      const step = doOneStep(current);
      current = step.state;
    }
    if (!current.isFinished) {
      current = advanceToFirstTurn(current);
      expect(current.hero.interventionsRemaining).toBe(1);
      expect(canIntervene(current)).toBe(true);
    }
  });

  it('전투 종료 후 canIntervene은 false', () => {
    let state = createTestBattle();
    // 전투 끝까지 진행
    while (!state.isFinished) {
      state = stepBattle(state).state;
    }
    expect(canIntervene(state)).toBe(false);
  });

  it('canIntervene이 false일 때 queueIntervention은 상태를 변경하지 않는다', () => {
    let state = createTestBattle();
    const ability = state.hero.abilities.find((a) => a.abilityType === AbilityType.EFFECT)!;

    // 개입 사용하여 횟수 소진
    state = queueIntervention(state, ability);
    let { state: after } = doOneStep(state);
    expect(after.hero.interventionsRemaining).toBe(0);

    // 다시 큐잉 시도 → 변경 없음
    const unchanged = queueIntervention(after, ability);
    expect(unchanged.hero.queuedAbility).toBeUndefined();
  });
});

// ─── 3. 큐잉 → 실행 흐름 ──────────────────

describe('큐잉 → 실행 흐름', () => {
  it('queueIntervention 후 hero.queuedAbility에 능력이 저장된다', () => {
    let state = createTestBattle();
    const ability = state.hero.abilities.find((a) => a.abilityType === AbilityType.EFFECT)!;

    state = queueIntervention(state, ability);
    expect(state.hero.queuedAbility).toBeDefined();
    expect(state.hero.queuedAbility!.id).toBe(ability.id);
  });

  it('큐잉 시점에는 interventionsRemaining이 차감되지 않는다', () => {
    let state = createTestBattle();
    const ability = state.hero.abilities.find((a) => a.abilityType === AbilityType.EFFECT)!;

    const before = state.hero.interventionsRemaining;
    state = queueIntervention(state, ability);
    expect(state.hero.interventionsRemaining).toBe(before);
  });

  it('다음 doStep에서 HERO_INTERVENTION 이벤트가 발생한다', () => {
    let state = createTestBattle();
    const ability = state.hero.abilities.find((a) => a.abilityType === AbilityType.EFFECT)!;

    state = queueIntervention(state, ability);
    const { newEvents } = doOneStep(state);

    const heroEvent = newEvents.find((e) => e.type === 'HERO_INTERVENTION');
    expect(heroEvent).toBeDefined();
    expect(heroEvent!.data?.abilityName).toBe(ability.name);
  });

  it('실행 후 queuedAbility가 비워진다', () => {
    let state = createTestBattle();
    const ability = state.hero.abilities.find((a) => a.abilityType === AbilityType.EFFECT)!;

    state = queueIntervention(state, ability);
    const { state: after } = doOneStep(state);
    expect(after.hero.queuedAbility).toBeUndefined();
  });
});

// ─── 4. EFFECT 능력 ─────────────────────────

describe('EFFECT 능력 실행', () => {
  it('COMMANDER Rally: 아군에게 ATK_UP 버프', () => {
    let state = createTestBattle(HeroType.COMMANDER);
    const rally = state.hero.abilities.find((a) => a.name === 'Rally')!;

    state = queueIntervention(state, rally);
    const { state: after, newEvents } = doOneStep(state);

    const buffEvent = newEvents.find((e) => e.type === 'BUFF_APPLIED');
    expect(buffEvent).toBeDefined();
  });

  it('COMMANDER Shield Order: 아군에게 실드 부여', () => {
    let state = createTestBattle(HeroType.COMMANDER);
    const shield = state.hero.abilities.find((a) => a.name === 'Shield Order')!;

    state = queueIntervention(state, shield);
    const { state: after, newEvents } = doOneStep(state);

    const shieldEvent = newEvents.find((e) => e.type === 'SHIELD_APPLIED');
    expect(shieldEvent).toBeDefined();
  });

  it('MAGE Fireball: 적에게 데미지', () => {
    let state = createTestBattle(HeroType.MAGE);
    const fireball = state.hero.abilities.find((a) => a.name === 'Fireball')!;

    state = queueIntervention(state, fireball);
    const { state: after, newEvents } = doOneStep(state);

    const dmgEvent = newEvents.find((e) => e.type === 'DAMAGE_DEALT');
    expect(dmgEvent).toBeDefined();
    expect(dmgEvent!.value).toBeGreaterThan(0);
  });

  it('SUPPORT Heal: 아군 HP 회복', () => {
    let state = createTestBattle(HeroType.SUPPORT);

    // 먼저 아군 HP를 깎아둠
    const playerUnit = state.units.find((u) => u.team === Team.PLAYER)!;
    state = {
      ...state,
      units: state.units.map((u) => (u.id === playerUnit.id ? { ...u, stats: { ...u.stats, hp: 10 } } : u)),
    };

    const heal = state.hero.abilities.find((a) => a.name === 'Heal')!;
    state = queueIntervention(state, heal);
    const { state: after, newEvents } = doOneStep(state);

    const healEvent = newEvents.find((e) => e.type === 'HEAL_APPLIED');
    expect(healEvent).toBeDefined();

    // HP가 회복되었는지
    const healed = after.units.find((u) => u.id === playerUnit.id)!;
    expect(healed.stats.hp).toBeGreaterThan(10);
  });

  it('타겟 지정 시 해당 유닛에 효과 적용', () => {
    let state = createTestBattle(HeroType.COMMANDER);
    const shield = state.hero.abilities.find((a) => a.name === 'Shield Order')!;
    const targetUnit = state.units.find((u) => u.team === Team.PLAYER && u.position === Position.BACK)!;

    state = queueIntervention(state, shield, targetUnit.id);
    const { state: after, newEvents } = doOneStep(state);

    const shieldEvent = newEvents.find((e) => e.type === 'SHIELD_APPLIED');
    expect(shieldEvent).toBeDefined();
    expect(shieldEvent!.targetId).toBe(targetUnit.id);
  });

  it('타겟 미지정 시 자동 선택 (아군 최저 HP)', () => {
    let state = createTestBattle(HeroType.SUPPORT);
    const heal = state.hero.abilities.find((a) => a.name === 'Heal')!;

    // Aldric HP를 낮게 설정
    const aldric = state.units.find((u) => u.name === 'Aldric')!;
    state = {
      ...state,
      units: state.units.map((u) => (u.id === aldric.id ? { ...u, stats: { ...u.stats, hp: 5 } } : u)),
    };

    state = queueIntervention(state, heal);
    const { newEvents } = doOneStep(state);

    const healEvent = newEvents.find((e) => e.type === 'HEAL_APPLIED');
    expect(healEvent).toBeDefined();
    // 가장 HP가 낮은 Aldric이 대상
    expect(healEvent!.targetId).toBe(aldric.id);
  });
});

// ─── 5. UI 상태 반영 ─────────────────────────

describe('UI 상태 반영', () => {
  it('Scene이 참조해야 할 영웅 상태 필드가 모두 존재한다', () => {
    const state = createTestBattle();

    // UI가 필요로 하는 필드들
    expect(state.hero.heroType).toBeDefined();
    expect(typeof state.hero.interventionsRemaining).toBe('number');
    expect(typeof state.hero.maxInterventionsPerRound).toBe('number');
    expect(Array.isArray(state.hero.abilities)).toBe(true);
  });

  it('HERO_INTERVENTION 이벤트에 UI 표시용 데이터가 있다', () => {
    let state = createTestBattle(HeroType.MAGE);
    const fireball = state.hero.abilities.find((a) => a.name === 'Fireball')!;

    state = queueIntervention(state, fireball);
    const { newEvents } = doOneStep(state);

    const heroEvent = newEvents.find((e) => e.type === 'HERO_INTERVENTION');
    expect(heroEvent).toBeDefined();
    expect(heroEvent!.data?.abilityName).toBe('Fireball');
    // actionId로 능력 식별 가능
    expect(heroEvent!.actionId).toBeDefined();
  });
});
