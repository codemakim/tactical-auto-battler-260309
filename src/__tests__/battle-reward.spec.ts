import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Difficulty, Team, Position } from '../types';
import type { BattleState, RunState, BattleReward } from '../types';
import { calculateGoldReward, generateBattleRewards, applyReward } from '../systems/BattleRewardSystem';

// --- 테스트용 헬퍼 ---

function makeFinishedState(overrides: Partial<BattleState> = {}): BattleState {
  const warrior = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
  const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
  enemy.isAlive = false;

  return {
    units: [warrior, enemy],
    reserve: [],
    hero: { heroType: 'COMMANDER', interventionsRemaining: 1, maxInterventionsPerRound: 1, abilities: [] },
    round: 3,
    turn: 0,
    turnOrder: [],
    phase: 'BATTLE_END',
    events: [],
    delayedEffects: [],
    isFinished: true,
    winner: Team.PLAYER,
    seed: 42,
    ...overrides,
  };
}

function makeRunState(overrides: Partial<RunState> = {}): RunState {
  return {
    currentStage: 1,
    difficulty: Difficulty.STANDARD,
    gold: 100,
    temporaryActions: [],
    ...overrides,
  };
}

describe('전투 보상 시스템 (BattleRewardSystem)', () => {
  beforeEach(() => resetUnitCounter());

  // === calculateGoldReward ===

  describe('골드 보상 계산 (calculateGoldReward)', () => {
    it('승리 시 골드 보상이 양수이다', () => {
      const state = makeFinishedState({ winner: Team.PLAYER, round: 3 });
      const gold = calculateGoldReward(state, Difficulty.STANDARD);

      expect(gold).toBeGreaterThan(0);
    });

    it('빠르게 끝낸 전투(3라운드)가 느린 전투(15라운드)보다 골드가 많다', () => {
      const fastState = makeFinishedState({ winner: Team.PLAYER, round: 3 });
      const slowState = makeFinishedState({ winner: Team.PLAYER, round: 15 });

      const fastGold = calculateGoldReward(fastState, Difficulty.STANDARD);
      const slowGold = calculateGoldReward(slowState, Difficulty.STANDARD);

      expect(fastGold).toBeGreaterThan(slowGold);
    });

    it('NIGHTMARE 난이도가 EASY보다 골드가 많다', () => {
      const state = makeFinishedState({ winner: Team.PLAYER, round: 5 });

      const easyGold = calculateGoldReward(state, Difficulty.EASY);
      const nightmareGold = calculateGoldReward(state, Difficulty.NIGHTMARE);

      expect(nightmareGold).toBeGreaterThan(easyGold);
    });

    it('HARD 난이도가 STANDARD보다 골드가 많다', () => {
      const state = makeFinishedState({ winner: Team.PLAYER, round: 5 });

      const standardGold = calculateGoldReward(state, Difficulty.STANDARD);
      const hardGold = calculateGoldReward(state, Difficulty.HARD);

      expect(hardGold).toBeGreaterThan(standardGold);
    });

    it('패배 시 골드가 승리보다 적다', () => {
      const winState = makeFinishedState({ winner: Team.PLAYER, round: 5 });
      const loseState = makeFinishedState({ winner: Team.ENEMY, round: 5 });

      const winGold = calculateGoldReward(winState, Difficulty.STANDARD);
      const loseGold = calculateGoldReward(loseState, Difficulty.STANDARD);

      expect(loseGold).toBeLessThan(winGold);
    });

    it('패배 시에도 골드가 0 이상이다', () => {
      const state = makeFinishedState({ winner: Team.ENEMY, round: 20 });
      const gold = calculateGoldReward(state, Difficulty.EASY);

      expect(gold).toBeGreaterThanOrEqual(0);
    });
  });

  // === generateBattleRewards ===

  describe('전투 보상 생성 (generateBattleRewards)', () => {
    it('액션 옵션이 최대 5개 생성된다', () => {
      const state = makeFinishedState();
      const runState = makeRunState();

      const reward = generateBattleRewards(state, runState, 42);

      expect(reward.actionOptions.length).toBeLessThanOrEqual(5);
      expect(reward.actionOptions.length).toBeGreaterThan(0);
    });

    it('같은 seed면 동일한 보상이 생성된다 (결정론적)', () => {
      const state = makeFinishedState();
      const runState = makeRunState();

      const reward1 = generateBattleRewards(state, runState, 1234);
      const reward2 = generateBattleRewards(state, runState, 1234);

      expect(reward1.gold).toBe(reward2.gold);
      expect(reward1.actionOptions.map((a) => a.id)).toEqual(reward2.actionOptions.map((a) => a.id));
    });

    it('다른 seed면 다른 액션 옵션이 생성될 수 있다', () => {
      const state = makeFinishedState();
      const runState = makeRunState();

      const reward1 = generateBattleRewards(state, runState, 1);
      const reward2 = generateBattleRewards(state, runState, 9999);

      // 두 결과가 완전히 같을 확률은 매우 낮음
      const ids1 = reward1.actionOptions.map((a) => a.id).join(',');
      const ids2 = reward2.actionOptions.map((a) => a.id).join(',');
      expect(ids1).not.toBe(ids2);
    });

    it('반환된 BattleReward에 gold와 actionOptions 필드가 있다', () => {
      const state = makeFinishedState();
      const runState = makeRunState();

      const reward = generateBattleRewards(state, runState, 42);

      expect(reward).toHaveProperty('gold');
      expect(reward).toHaveProperty('actionOptions');
      expect(typeof reward.gold).toBe('number');
      expect(Array.isArray(reward.actionOptions)).toBe(true);
    });

    it('패배 시에도 보상 생성 가능하되 골드가 줄어든다', () => {
      const winState = makeFinishedState({ winner: Team.PLAYER });
      const loseState = makeFinishedState({ winner: Team.ENEMY });
      const runState = makeRunState();

      const winReward = generateBattleRewards(winState, runState, 42);
      const loseReward = generateBattleRewards(loseState, runState, 42);

      expect(loseReward.gold).toBeLessThan(winReward.gold);
    });
  });

  // === applyReward ===

  describe('보상 적용 (applyReward)', () => {
    it('applyReward로 골드가 RunState에 반영된다', () => {
      const runState = makeRunState({ gold: 100 });
      const reward: BattleReward = { gold: 50, actionOptions: [] };

      const newRunState = applyReward(runState, reward);

      expect(newRunState.gold).toBe(150);
    });

    it('액션 미선택 시 골드만 반영된다', () => {
      const runState = makeRunState({ gold: 200, temporaryActions: [] });
      const reward: BattleReward = { gold: 30, actionOptions: [] };

      const newRunState = applyReward(runState, reward);

      expect(newRunState.gold).toBe(230);
      expect(newRunState.temporaryActions).toHaveLength(0);
    });

    it('applyReward로 temporaryActions에 선택 액션이 추가된다', () => {
      const warrior = createUnit(createCharacterDef('Hero', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

      const runState = makeRunState({ gold: 100, temporaryActions: [] });
      const selectedAction = { id: 'warrior_heavy_slam', name: 'Heavy Slam', description: 'desc', effects: [] };
      const reward: BattleReward = { gold: 20, actionOptions: [selectedAction] };

      const newRunState = applyReward(runState, reward, selectedAction, warrior, 0);

      expect(newRunState.gold).toBe(120);
      expect(newRunState.temporaryActions).toHaveLength(1);
      expect(newRunState.temporaryActions[0].id).toBe('warrior_heavy_slam');
    });

    it('원본 RunState는 변경되지 않는다 (불변성)', () => {
      const runState = makeRunState({ gold: 100, temporaryActions: [] });
      const reward: BattleReward = { gold: 50, actionOptions: [] };

      applyReward(runState, reward);

      expect(runState.gold).toBe(100);
      expect(runState.temporaryActions).toHaveLength(0);
    });

    it('유효하지 않은 슬롯 인덱스로 교체 시도 시 골드만 반영된다', () => {
      const warrior = createUnit(createCharacterDef('Hero', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);

      const runState = makeRunState({ gold: 100, temporaryActions: [] });
      const selectedAction = { id: 'some_action', name: 'Action', description: '', effects: [] };
      const reward: BattleReward = { gold: 30, actionOptions: [selectedAction] };

      // 존재하지 않는 슬롯 인덱스 → replaceActionSlot null 반환 → 골드만 반영
      const newRunState = applyReward(runState, reward, selectedAction, warrior, 99);

      expect(newRunState.gold).toBe(130);
      // 교체 실패로 temporaryActions은 그대로
      expect(newRunState.temporaryActions).toHaveLength(0);
    });
  });
});
