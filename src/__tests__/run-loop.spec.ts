/**
 * 런 루프 연결 테스트
 *
 * run-loop-ui-spec.md 기반
 * createStageBattleState() + 런 흐름 통합 검증
 *
 * 카테고리:
 * 1. createStageBattleState — 파티/적/시드 올바른 초기화
 * 2. 런 흐름 통합 — 5스테이지 순환 검증
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRunState,
  createStageBattleState,
  executeStageBattle,
  processVictory,
  advanceStage,
  selectCardReward,
  processDefeat,
  endRun,
} from '../core/RunManager';
import { stepBattle } from '../core/BattleEngine';
import { createCharacterDef, resetUnitCounter } from '../entities/UnitFactory';
import { resetCardInstanceCounter } from '../systems/BattleRewardSystem';
import { CharacterClass, Team, Position, RunStatus, BattlePhase } from '../types';
import type { CharacterDefinition, BattleState, RunState } from '../types';

// ─── 헬퍼 ────────────────────────────────

function makeParty(): CharacterDefinition[] {
  return [
    createCharacterDef('Warrior', CharacterClass.WARRIOR),
    createCharacterDef('Archer', CharacterClass.ARCHER),
    createCharacterDef('Guardian', CharacterClass.GUARDIAN),
    createCharacterDef('Assassin', CharacterClass.ASSASSIN),
  ];
}

beforeEach(() => {
  resetUnitCounter();
  resetCardInstanceCounter();
});

// ═══════════════════════════════════════════
// 1. createStageBattleState
// ═══════════════════════════════════════════

describe('createStageBattleState', () => {
  it('아군 4명 + 적 유닛 생성', () => {
    const party = makeParty();
    const runState = createRunState(party, 42);

    const battleState = createStageBattleState(runState);

    const playerUnits = battleState.units.filter((u) => u.team === Team.PLAYER);
    const enemyUnits = battleState.units.filter((u) => u.team === Team.ENEMY);
    expect(playerUnits.length).toBe(4);
    expect(enemyUnits.length).toBeGreaterThan(0);
  });

  it('풀 HP로 생성 (hp === maxHp)', () => {
    const party = makeParty();
    const runState = createRunState(party, 42);

    const battleState = createStageBattleState(runState);

    for (const unit of battleState.units.filter((u) => u.team === Team.PLAYER)) {
      expect(unit.stats.hp).toBe(unit.stats.maxHp);
      expect(unit.isAlive).toBe(true);
    }
  });

  it('스테이지별 다른 적 생성', () => {
    const party = makeParty();
    const run1 = createRunState(party, 42);
    const run3 = { ...run1, currentStage: 3 };

    resetUnitCounter();
    const battle1 = createStageBattleState(run1);
    resetUnitCounter();
    const battle3 = createStageBattleState(run3);

    const enemies1 = battle1.units.filter((u) => u.team === Team.ENEMY);
    const enemies3 = battle3.units.filter((u) => u.team === Team.ENEMY);

    // Stage 1: 2명, Stage 3: 3명 (enemy-encounter-spec 기준)
    expect(enemies1.length).toBeLessThanOrEqual(enemies3.length);
  });

  it('시드가 결정론적 (같은 입력 = 같은 결과)', () => {
    const party = makeParty();
    const run = createRunState(party, 42);

    resetUnitCounter();
    const battle1 = createStageBattleState(run);
    resetUnitCounter();
    const battle2 = createStageBattleState(run);

    expect(battle1.units.map((u) => u.name)).toEqual(battle2.units.map((u) => u.name));
    expect(battle1.seed).toBe(battle2.seed);
  });

  it('executeStageBattle과 동일한 초기 상태', () => {
    const party = makeParty();
    const run = createRunState(party, 100);

    resetUnitCounter();
    const stateFromCreate = createStageBattleState(run);
    resetUnitCounter();
    const { battleState: stateFromExecute } = executeStageBattle(run);

    // 동일한 유닛 이름/팀 구성
    expect(stateFromCreate.units.map((u) => `${u.name}-${u.team}`)).toEqual(
      stateFromExecute.units.map((u) => `${u.name}-${u.team}`),
    );
    expect(stateFromCreate.seed).toBe(stateFromExecute.seed);
  });

  it('장착된 카드가 반영됨', () => {
    const party = makeParty();
    const run = createRunState(party, 200);
    // 카드를 인벤토리에 추가 후 장착
    const card = {
      instanceId: 'test_card',
      templateId: 'tpl',
      action: {
        id: 'custom',
        name: 'Custom Strike',
        description: 'test',
        effects: [{ type: 'DAMAGE' as const, value: 2.0 }],
      },
      rarity: 'COMMON' as const,
    };
    const withCard: RunState = {
      ...run,
      cardInventory: [card],
      equippedCards: { [party[0].id]: { 0: 'test_card' } },
    };

    const battleState = createStageBattleState(withCard);
    const warrior = battleState.units.find((u) => u.name === 'Warrior');
    expect(warrior!.actionSlots[0].action.name).toBe('Custom Strike');
  });
});

// ═══════════════════════════════════════════
// 2. 런 흐름 통합
// ═══════════════════════════════════════════

describe('런 흐름 통합', () => {
  it('stepBattle로 한 턴씩 진행 가능', () => {
    const party = makeParty();
    const run = createRunState(party, 300);
    let state = createStageBattleState(run);

    // 몇 턴 진행
    for (let i = 0; i < 5 && !state.isFinished; i++) {
      const result = stepBattle(state);
      state = result.state;
    }

    // 이벤트가 기록됨
    expect(state.events.length).toBeGreaterThan(0);
  });

  it('5스테이지 런 완주 시뮬레이션', () => {
    const party = makeParty();
    let runState = createRunState(party, 42);

    for (let stage = 1; stage <= 5; stage++) {
      expect(runState.currentStage).toBe(stage);
      expect(runState.status).toBe(RunStatus.IN_PROGRESS);

      // 전투 실행 (시뮬레이션용)
      const { battleState, victory } = executeStageBattle(runState);

      if (victory) {
        const result = processVictory(runState, battleState);
        runState = result.runState;

        // 카드 선택 (첫 번째 카드)
        if (result.reward.cardOptions.length > 0) {
          runState = selectCardReward(runState, result.reward.cardOptions[0]);
        }

        // 스테이지 진행
        runState = advanceStage(runState);
      } else {
        // 패배 시 리트라이
        runState = processDefeat(runState);
        if (runState.status === RunStatus.DEFEAT) break;
        // 리트라이: 같은 스테이지 재시도
        stage--; // for 루프 보정
      }
    }

    // 5스테이지 완주 or 패배로 종료
    expect([RunStatus.VICTORY, RunStatus.DEFEAT]).toContain(runState.status);
  });

  it('패배 → 리트라이 → 재전투 흐름', () => {
    const party = makeParty();
    let runState = createRunState(party, 42);

    // Stage 1 패배 시뮬레이션
    expect(runState.retryAvailable).toBe(true);

    // 첫 패배 → 리트라이 소모
    runState = processDefeat(runState);
    expect(runState.retryAvailable).toBe(false);
    expect(runState.status).toBe(RunStatus.IN_PROGRESS);
    expect(runState.currentStage).toBe(1); // 같은 스테이지

    // 두 번째 패배 → 런 종료
    runState = processDefeat(runState);
    expect(runState.status).toBe(RunStatus.DEFEAT);
  });

  it('런 중 카드 인벤토리 누적', () => {
    const party = makeParty();
    let runState = createRunState(party, 500);

    // Stage 1 승리
    const { battleState } = executeStageBattle(runState);
    const result = processVictory(runState, battleState);
    runState = result.runState;

    if (result.reward.cardOptions.length > 0) {
      runState = selectCardReward(runState, result.reward.cardOptions[0]);
      expect(runState.cardInventory).toHaveLength(1);
    }

    runState = advanceStage(runState);

    // Stage 2 승리
    const { battleState: bs2 } = executeStageBattle(runState);
    const result2 = processVictory(runState, bs2);
    runState = result2.runState;

    if (result2.reward.cardOptions.length > 0) {
      runState = selectCardReward(runState, result2.reward.cardOptions[0]);
      expect(runState.cardInventory).toHaveLength(2); // 누적
    }
  });
});
