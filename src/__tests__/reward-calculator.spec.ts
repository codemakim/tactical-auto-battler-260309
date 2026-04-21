/**
 * 보상 화면 계산 테스트
 *
 * reward-ui-spec.md §2 기반
 * calculateRewardPhase() / applyRewardSelections() 순수 함수 검증
 *
 * 카테고리:
 * 1. calculateRewardPhase — 골드/카드/스테이지 데이터 추출
 * 2. applyRewardSelections — 카드 선택, 스테이지 진행
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { calculateRewardPhase, applyRewardSelections } from '../systems/RewardCalculator';
import { createRunState } from '../core/RunManager';
import { createBattleState, runFullBattle } from '../core/BattleEngine';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { resetCardInstanceCounter } from '../systems/BattleRewardSystem';
import { CharacterClass, RunStatus, Team, Position, Rarity, RewardKind } from '../types';
import type { RunState, BattleState, CardInstance, CharacterDefinition } from '../types';

// ─── 헬퍼 ────────────────────────────────

function makeParty(): CharacterDefinition[] {
  return [
    createCharacterDef('Warrior', CharacterClass.WARRIOR),
    createCharacterDef('Archer', CharacterClass.ARCHER),
    createCharacterDef('Guardian', CharacterClass.GUARDIAN),
    createCharacterDef('Assassin', CharacterClass.ASSASSIN),
  ];
}

/** 승리 완료된 BattleState 생성 (아군 압도적 유리) */
function makeVictoryBattle(party: CharacterDefinition[], seed: number): BattleState {
  resetUnitCounter();
  const players = party
    .slice(0, 3)
    .map((def, i) => createUnit(def, Team.PLAYER, i < 2 ? Position.FRONT : Position.BACK));
  // 약한 적 1명 (빠르게 승리)
  const enemy = createUnit(createCharacterDef('Weakling', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
  // 적 HP를 1로 설정
  const weakEnemy = { ...enemy, stats: { ...enemy.stats, hp: 1, maxHp: 1 } };

  const state = createBattleState(players, [weakEnemy], seed);
  return runFullBattle(state);
}

function makeDummyCard(id: string, classRestriction?: string): CardInstance {
  return {
    instanceId: id,
    templateId: `template_${id}`,
    action: { id: `action_${id}`, name: `Card ${id}`, description: 'test', effects: [] },
    classRestriction,
    rarity: Rarity.COMMON,
  };
}

beforeEach(() => {
  resetUnitCounter();
  resetCardInstanceCounter();
});

// ═══════════════════════════════════════════
// 1. calculateRewardPhase
// ═══════════════════════════════════════════

describe('calculateRewardPhase', () => {
  it('골드가 0보다 크게 반환됨', () => {
    const party = makeParty();
    const runState = createRunState(party, 100);
    const battleState = makeVictoryBattle(party, 101);

    const { rewardData } = calculateRewardPhase(runState, battleState);

    expect(rewardData.goldEarned).toBeGreaterThan(0);
  });

  it('카드 옵션 5장 반환', () => {
    const party = makeParty();
    const runState = createRunState(party, 200);
    const battleState = makeVictoryBattle(party, 201);

    const { rewardData } = calculateRewardPhase(runState, battleState);

    expect(rewardData.cardOptions).toHaveLength(5);
    // 각 카드에 필수 필드 존재
    for (const card of rewardData.cardOptions) {
      expect(card.instanceId).toBeTruthy();
      expect(card.action.name).toBeTruthy();
      expect(card.rarity).toBeTruthy();
    }
  });

  it('Stage 2 보상은 카드 대신 전술 유물 3개를 반환한다', () => {
    const party = makeParty();
    const runState = { ...createRunState(party, 250), currentStage: 2 };
    const battleState = makeVictoryBattle(party, 251);

    const { rewardData } = calculateRewardPhase(runState, battleState);

    expect(rewardData.rewardKind).toBe(RewardKind.ARTIFACT);
    expect(rewardData.cardOptions).toHaveLength(0);
    expect(rewardData.artifactOptions).toHaveLength(3);
  });

  it('마지막 스테이지 보상은 런 종료만 처리하고 카드/유물을 표시하지 않는다', () => {
    const party = makeParty();
    const runState = { ...createRunState(party, 260), currentStage: 5 };
    const battleState = makeVictoryBattle(party, 261);

    const { rewardData } = calculateRewardPhase(runState, battleState);

    expect(rewardData.rewardKind).toBe(RewardKind.NONE);
    expect(rewardData.cardOptions).toHaveLength(0);
    expect(rewardData.artifactOptions).toHaveLength(0);
    expect(rewardData.isLastStage).toBe(true);
  });

  it('isLastStage: Stage < maxStages → false', () => {
    const party = makeParty();
    const runState = { ...createRunState(party, 500), currentStage: 2 };
    const battleState = makeVictoryBattle(party, 501);

    const { rewardData } = calculateRewardPhase(runState, battleState);

    expect(rewardData.isLastStage).toBe(false);
    expect(rewardData.currentStage).toBe(2);
    expect(rewardData.maxStages).toBe(5);
  });

  it('isLastStage: Stage = maxStages → true', () => {
    const party = makeParty();
    const runState = { ...createRunState(party, 600), currentStage: 5 };
    const battleState = makeVictoryBattle(party, 601);

    const { rewardData } = calculateRewardPhase(runState, battleState);

    expect(rewardData.isLastStage).toBe(true);
  });

  it('updatedRunState에 골드가 적용되어 있음', () => {
    const party = makeParty();
    const runState = createRunState(party, 700);
    expect(runState.gold).toBe(0);

    const battleState = makeVictoryBattle(party, 701);
    const { rewardData, updatedRunState } = calculateRewardPhase(runState, battleState);

    expect(updatedRunState.gold).toBe(rewardData.goldEarned);
  });
});

// ═══════════════════════════════════════════
// 2. applyRewardSelections
// ═══════════════════════════════════════════

describe('applyRewardSelections', () => {
  /** 골드가 적용된 RunState + 카드 옵션을 준비 */
  function prepareRewardState(): { updatedRunState: RunState; cardOptions: CardInstance[] } {
    const party = makeParty();
    const runState = createRunState(party, 1000);
    const battleState = makeVictoryBattle(party, 1001);
    const { rewardData, updatedRunState } = calculateRewardPhase(runState, battleState);
    return { updatedRunState, cardOptions: rewardData.cardOptions };
  }

  it('카드 선택 시 인벤토리에 추가', () => {
    const { updatedRunState, cardOptions } = prepareRewardState();
    expect(updatedRunState.cardInventory).toHaveLength(0);

    const result = applyRewardSelections(updatedRunState, cardOptions[0]);

    expect(result.cardInventory).toHaveLength(1);
    expect(result.cardInventory[0].instanceId).toBe(cardOptions[0].instanceId);
  });

  it('카드 건너뛰기 시 인벤토리 변화 없음', () => {
    const { updatedRunState } = prepareRewardState();

    const result = applyRewardSelections(updatedRunState, null);

    expect(result.cardInventory).toHaveLength(0);
  });

  it('유물 선택 시 artifactIds에 추가되고 다음 스테이지로 진행한다', () => {
    const party = makeParty();
    const runState = { ...createRunState(party, 1200), currentStage: 2 };
    const battleState = makeVictoryBattle(party, 1201);
    const { rewardData, updatedRunState } = calculateRewardPhase(runState, battleState);

    const result = applyRewardSelections(updatedRunState, null, rewardData.artifactOptions[0].id);

    expect(result.artifactIds).toEqual([rewardData.artifactOptions[0].id]);
    expect(result.currentStage).toBe(3);
  });

  it('다음 스테이지 진행 (Stage 1 → 2)', () => {
    const { updatedRunState } = prepareRewardState();
    expect(updatedRunState.currentStage).toBe(1);

    const result = applyRewardSelections(updatedRunState, null);

    expect(result.currentStage).toBe(2);
    expect(result.retryAvailable).toBe(true); // 새 스테이지에서 리트라이 복원
    expect(result.status).toBe(RunStatus.IN_PROGRESS);
  });

  it('마지막 스테이지 클리어 → 런 승리', () => {
    const { updatedRunState } = prepareRewardState();
    const lastStageState: RunState = { ...updatedRunState, currentStage: 5 };

    const result = applyRewardSelections(lastStageState, null);

    expect(result.status).toBe(RunStatus.VICTORY);
  });

  it('카드 선택 + 스테이지 진행 복합', () => {
    const { updatedRunState, cardOptions } = prepareRewardState();
    const state: RunState = {
      ...updatedRunState,
      currentStage: 3,
    };

    const result = applyRewardSelections(state, cardOptions[2]);

    // 카드 추가됨
    expect(result.cardInventory).toHaveLength(1);
    expect(result.cardInventory[0].instanceId).toBe(cardOptions[2].instanceId);
    // 스테이지 진행
    expect(result.currentStage).toBe(4);
  });

  it('골드가 이중 적용되지 않음 (updatedRunState 사용)', () => {
    const party = makeParty();
    const runState = createRunState(party, 1100);
    const battleState = makeVictoryBattle(party, 1101);
    const { rewardData, updatedRunState } = calculateRewardPhase(runState, battleState);

    const goldBefore = updatedRunState.gold;
    const result = applyRewardSelections(updatedRunState, null);

    // applyRewardSelections는 골드를 건드리지 않음
    expect(result.gold).toBe(goldBefore);
  });
});
