import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, Difficulty, Team, Position, RunStatus, Rarity } from '../types';
import type { BattleState, RunState, BattleReward, CardInstance, CharacterDefinition } from '../types';
import {
  calculateGoldReward,
  generateBattleRewards,
  applyReward,
  resetCardInstanceCounter,
} from '../systems/BattleRewardSystem';

// --- 테스트용 헬퍼 ---

function makeFinishedState(overrides: Partial<BattleState> = {}): BattleState {
  const warrior = createUnit(createCharacterDef('W', CharacterClass.WARRIOR), Team.PLAYER, Position.FRONT);
  const enemy = createUnit(createCharacterDef('E', CharacterClass.WARRIOR), Team.ENEMY, Position.FRONT);
  enemy.isAlive = false;

  return {
    units: [warrior, enemy],
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

const dummyPartyDef: CharacterDefinition = createCharacterDef('W', CharacterClass.WARRIOR);

function makeRunState(overrides: Partial<RunState> = {}): RunState {
  return {
    currentStage: 1,
    maxStages: 5,
    seed: 42,
    party: [dummyPartyDef],
    cardInventory: [],
    equippedCards: {},
    gold: 100,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: [dummyPartyDef],
    ...overrides,
  };
}

function makeDummyCard(id: string): CardInstance {
  return {
    instanceId: id,
    templateId: 'test_template',
    action: { id: 'test_action', name: 'Test', description: 'test', effects: [] },
    rarity: Rarity.COMMON,
  };
}

describe('전투 보상 시스템 (BattleRewardSystem)', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetCardInstanceCounter();
  });

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
    it('카드 옵션이 최대 5개 생성된다', () => {
      const state = makeFinishedState();

      const reward = generateBattleRewards(state, [CharacterClass.WARRIOR], 42);

      expect(reward.cardOptions.length).toBeLessThanOrEqual(5);
      expect(reward.cardOptions.length).toBeGreaterThan(0);
    });

    it('같은 seed면 동일한 보상이 생성된다 (결정론적)', () => {
      const state = makeFinishedState();

      resetCardInstanceCounter();
      const reward1 = generateBattleRewards(state, [CharacterClass.WARRIOR], 1234);
      resetCardInstanceCounter();
      const reward2 = generateBattleRewards(state, [CharacterClass.WARRIOR], 1234);

      expect(reward1.gold).toBe(reward2.gold);
      expect(reward1.cardOptions.map((c) => c.action.id)).toEqual(reward2.cardOptions.map((c) => c.action.id));
    });

    it('다른 seed면 다른 카드 옵션이 생성될 수 있다', () => {
      const state = makeFinishedState();

      const reward1 = generateBattleRewards(state, [CharacterClass.WARRIOR], 1);
      const reward2 = generateBattleRewards(state, [CharacterClass.WARRIOR], 9999);

      const ids1 = reward1.cardOptions.map((c) => c.action.id).join(',');
      const ids2 = reward2.cardOptions.map((c) => c.action.id).join(',');
      expect(ids1).not.toBe(ids2);
    });

    it('반환된 BattleReward에 gold와 cardOptions 필드가 있다', () => {
      const state = makeFinishedState();

      const reward = generateBattleRewards(state, [CharacterClass.WARRIOR], 42);

      expect(reward).toHaveProperty('gold');
      expect(reward).toHaveProperty('cardOptions');
      expect(typeof reward.gold).toBe('number');
      expect(Array.isArray(reward.cardOptions)).toBe(true);
    });

    it('패배 시에도 보상 생성 가능하되 골드가 줄어든다', () => {
      const winState = makeFinishedState({ winner: Team.PLAYER });
      const loseState = makeFinishedState({ winner: Team.ENEMY });

      const winReward = generateBattleRewards(winState, [CharacterClass.WARRIOR], 42);
      const loseReward = generateBattleRewards(loseState, [CharacterClass.WARRIOR], 42);

      expect(loseReward.gold).toBeLessThan(winReward.gold);
    });

    it('파티 전체 클래스 풀에서 카드를 생성한다', () => {
      const state = makeFinishedState();
      const classes = [CharacterClass.WARRIOR, CharacterClass.ARCHER, CharacterClass.GUARDIAN];

      const reward = generateBattleRewards(state, classes, 42);

      expect(reward.cardOptions.length).toBeGreaterThan(0);
    });
  });

  // === applyReward ===

  describe('보상 적용 (applyReward)', () => {
    it('applyReward로 골드가 RunState에 반영된다', () => {
      const runState = makeRunState({ gold: 100 });
      const reward: BattleReward = { gold: 50, cardOptions: [] };

      const newRunState = applyReward(runState, reward);

      expect(newRunState.gold).toBe(150);
    });

    it('카드 미선택 시 골드만 반영된다', () => {
      const runState = makeRunState({ gold: 200, cardInventory: [] });
      const reward: BattleReward = { gold: 30, cardOptions: [] };

      const newRunState = applyReward(runState, reward);

      expect(newRunState.gold).toBe(230);
      expect(newRunState.cardInventory).toHaveLength(0);
    });

    it('applyReward로 cardInventory에 선택 카드가 추가된다', () => {
      const runState = makeRunState({ gold: 100, cardInventory: [] });
      const selectedCard = makeDummyCard('card_1');
      const reward: BattleReward = { gold: 20, cardOptions: [selectedCard] };

      const newRunState = applyReward(runState, reward, selectedCard);

      expect(newRunState.gold).toBe(120);
      expect(newRunState.cardInventory).toHaveLength(1);
      expect(newRunState.cardInventory[0].instanceId).toBe('card_1');
    });

    it('원본 RunState는 변경되지 않는다 (불변성)', () => {
      const runState = makeRunState({ gold: 100, cardInventory: [] });
      const reward: BattleReward = { gold: 50, cardOptions: [] };

      applyReward(runState, reward);

      expect(runState.gold).toBe(100);
      expect(runState.cardInventory).toHaveLength(0);
    });
  });
});
