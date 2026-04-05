/**
 * RunManager 테스트
 * run-system-spec.md 기반
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCharacterDef, resetUnitCounter } from '../entities/UnitFactory';
import { CharacterClass, RunStatus, Rarity } from '../types';
import type { CardInstance, CharacterDefinition } from '../types';
import {
  createRunState,
  executeStageBattle,
  processVictory,
  processDefeat,
  selectCardReward,
  equipCard,
  unequipCard,
  advanceStage,
  endRun,
  getEquippableCards,
  getEffectiveActionSlots,
} from '../core/RunManager';
import { resetCardInstanceCounter } from '../systems/BattleRewardSystem';

// --- 헬퍼 ---

function makeParty(): CharacterDefinition[] {
  return [
    createCharacterDef('Warrior', CharacterClass.WARRIOR),
    createCharacterDef('Archer', CharacterClass.ARCHER),
    createCharacterDef('Guardian', CharacterClass.GUARDIAN),
    createCharacterDef('Assassin', CharacterClass.ASSASSIN),
  ];
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

describe('RunManager', () => {
  beforeEach(() => {
    resetUnitCounter();
    resetCardInstanceCounter();
  });

  // ═══════════════════════════════════════════
  // 1. 런 생성
  // ═══════════════════════════════════════════

  describe('런 생성 (createRunState)', () => {
    it('4명 파티로 런을 생성할 수 있다', () => {
      const party = makeParty();
      const run = createRunState(party, 42);

      expect(run.currentStage).toBe(1);
      expect(run.maxStages).toBe(5);
      expect(run.party).toHaveLength(4);
      expect(run.battlefieldId).toBe('plains');
      expect(run.cardInventory).toHaveLength(0);
      expect(run.gold).toBe(0);
      expect(run.retryAvailable).toBe(true);
      expect(run.status).toBe(RunStatus.IN_PROGRESS);
    });

    it('선택한 전장 ID를 런 상태에 저장한다', () => {
      const party = makeParty();
      const run = createRunState(party, 42, 'dark_forest');

      expect(run.battlefieldId).toBe('dark_forest');
      expect(run.maxStages).toBe(5);
    });

    it('4명이 아니면 에러를 던진다', () => {
      const party3 = makeParty().slice(0, 3);
      expect(() => createRunState(party3, 42)).toThrow();

      const party2 = makeParty().slice(0, 2);
      expect(() => createRunState(party2, 42)).toThrow();
    });

    it('5명 이상이면 에러를 던진다', () => {
      const party = [...makeParty(), createCharacterDef('Extra', CharacterClass.WARRIOR)];
      expect(() => createRunState(party, 42)).toThrow();
    });

    it('preRunPartySnapshot이 저장된다', () => {
      const party = makeParty();
      const run = createRunState(party, 42);

      expect(run.preRunPartySnapshot).toHaveLength(4);
      expect(run.preRunPartySnapshot[0].name).toBe('Warrior');
    });
  });

  // ═══════════════════════════════════════════
  // 2. 전투 실행
  // ═══════════════════════════════════════════

  describe('전투 실행 (executeStageBattle)', () => {
    it('Stage 1 전투가 정상적으로 완료된다', () => {
      const run = createRunState(makeParty(), 42);
      const result = executeStageBattle(run);

      expect(result.battleState.isFinished).toBe(true);
      expect(result.battleState.winner).toBeDefined();
      expect(typeof result.victory).toBe('boolean');
    });

    it('같은 seed면 동일한 결과가 나온다 (결정론적)', () => {
      const run1 = createRunState(makeParty(), 42);
      const run2 = createRunState(makeParty(), 42);

      const result1 = executeStageBattle(run1);
      const result2 = executeStageBattle(run2);

      expect(result1.victory).toBe(result2.victory);
      expect(result1.battleState.round).toBe(result2.battleState.round);
    });

    it('모든 스테이지(1~5)에서 전투를 실행할 수 있다', () => {
      for (let stage = 1; stage <= 5; stage++) {
        const run = createRunState(makeParty(), 100 + stage);
        const stageRun = { ...run, currentStage: stage };
        const result = executeStageBattle(stageRun);
        expect(result.battleState.isFinished).toBe(true);
      }
    });
  });

  // ═══════════════════════════════════════════
  // 3. 승리/패배 처리
  // ═══════════════════════════════════════════

  describe('승리 처리 (processVictory)', () => {
    it('골드와 카드 옵션이 포함된 보상을 반환한다', () => {
      const run = createRunState(makeParty(), 42);
      const { battleState } = executeStageBattle(run);

      const { reward, runState } = processVictory(run, battleState);

      expect(reward.gold).toBeGreaterThan(0);
      expect(reward.cardOptions.length).toBeGreaterThan(0);
      expect(runState.gold).toBeGreaterThan(0);
    });
  });

  describe('패배 처리 (processDefeat)', () => {
    it('첫 번째 패배: retryAvailable 소모', () => {
      const run = createRunState(makeParty(), 42);
      expect(run.retryAvailable).toBe(true);

      const afterDefeat = processDefeat(run);
      expect(afterDefeat.retryAvailable).toBe(false);
      expect(afterDefeat.status).toBe(RunStatus.IN_PROGRESS);
    });

    it('두 번째 패배: 런 실패', () => {
      const run = createRunState(makeParty(), 42);
      const afterFirst = processDefeat(run);
      const afterSecond = processDefeat(afterFirst);

      expect(afterSecond.status).toBe(RunStatus.DEFEAT);
    });
  });

  // ═══════════════════════════════════════════
  // 4. 카드 인벤토리
  // ═══════════════════════════════════════════

  describe('카드 인벤토리', () => {
    it('selectCardReward로 카드가 인벤토리에 추가된다', () => {
      const run = createRunState(makeParty(), 42);
      const card = makeDummyCard('card_1');

      const newRun = selectCardReward(run, card);

      expect(newRun.cardInventory).toHaveLength(1);
      expect(newRun.cardInventory[0].instanceId).toBe('card_1');
    });

    it('여러 카드를 순차 추가할 수 있다', () => {
      let run = createRunState(makeParty(), 42);
      run = selectCardReward(run, makeDummyCard('c1'));
      run = selectCardReward(run, makeDummyCard('c2'));
      run = selectCardReward(run, makeDummyCard('c3'));

      expect(run.cardInventory).toHaveLength(3);
    });
  });

  // ═══════════════════════════════════════════
  // 5. 카드 장착/해제
  // ═══════════════════════════════════════════

  describe('카드 장착/해제', () => {
    it('카드를 캐릭터 슬롯에 장착할 수 있다', () => {
      let run = createRunState(makeParty(), 42);
      const card = makeDummyCard('c1');
      run = selectCardReward(run, card);

      const charId = run.party[0].id;
      run = equipCard(run, charId, 0, 'c1');

      expect(run.equippedCards[charId]?.[0]).toBe('c1');
    });

    it('장착된 카드를 해제하면 슬롯이 비워진다', () => {
      let run = createRunState(makeParty(), 42);
      run = selectCardReward(run, makeDummyCard('c1'));
      const charId = run.party[0].id;
      run = equipCard(run, charId, 0, 'c1');
      run = unequipCard(run, charId, 0);

      expect(run.equippedCards[charId]?.[0]).toBeUndefined();
    });

    it('다른 클래스 전용 카드는 장착할 수 없다', () => {
      let run = createRunState(makeParty(), 42);
      // ARCHER 전용 카드를 WARRIOR에게 장착 시도
      const archerCard = makeDummyCard('archer_c1', CharacterClass.ARCHER);
      run = selectCardReward(run, archerCard);

      const warriorId = run.party[0].id; // Warrior
      const before = { ...run.equippedCards };
      run = equipCard(run, warriorId, 0, 'archer_c1');

      // 장착 실패 — equippedCards 변경 없음
      expect(run.equippedCards[warriorId]?.[0]).toBeUndefined();
    });

    it('공용 카드는 모든 클래스에 장착 가능하다', () => {
      let run = createRunState(makeParty(), 42);
      const universalCard = makeDummyCard('universal_c1'); // classRestriction 없음
      run = selectCardReward(run, universalCard);

      const warriorId = run.party[0].id;
      run = equipCard(run, warriorId, 0, 'universal_c1');

      expect(run.equippedCards[warriorId]?.[0]).toBe('universal_c1');
    });

    it('같은 카드를 다른 캐릭터에 장착하면 기존 장착이 해제된다', () => {
      let run = createRunState(makeParty(), 42);
      const card = makeDummyCard('c1');
      run = selectCardReward(run, card);

      const char1 = run.party[0].id;
      const char2 = run.party[1].id;

      run = equipCard(run, char1, 0, 'c1');
      expect(run.equippedCards[char1]?.[0]).toBe('c1');

      run = equipCard(run, char2, 1, 'c1');
      expect(run.equippedCards[char2]?.[1]).toBe('c1');
      expect(run.equippedCards[char1]?.[0]).toBeUndefined();
    });

    it('유효하지 않은 슬롯 인덱스는 무시된다', () => {
      let run = createRunState(makeParty(), 42);
      run = selectCardReward(run, makeDummyCard('c1'));
      const charId = run.party[0].id;

      const before = { ...run };
      run = equipCard(run, charId, 5, 'c1');

      expect(run.equippedCards[charId]?.[5]).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════
  // 6. 스테이지 진행
  // ═══════════════════════════════════════════

  describe('스테이지 진행 (advanceStage)', () => {
    it('다음 스테이지로 진행한다', () => {
      const run = createRunState(makeParty(), 42);
      const next = advanceStage(run);

      expect(next.currentStage).toBe(2);
      expect(next.retryAvailable).toBe(true);
    });

    it('마지막 스테이지 클리어 시 런 승리', () => {
      let run = createRunState(makeParty(), 42);
      run = { ...run, currentStage: 5 };

      const result = advanceStage(run);

      expect(result.status).toBe(RunStatus.VICTORY);
    });
  });

  // ═══════════════════════════════════════════
  // 8. 런 종료
  // ═══════════════════════════════════════════

  describe('런 종료 (endRun)', () => {
    it('카드 인벤토리가 초기화된다', () => {
      let run = createRunState(makeParty(), 42);
      run = selectCardReward(run, makeDummyCard('c1'));
      run = selectCardReward(run, makeDummyCard('c2'));

      const ended = endRun(run);

      expect(ended.cardInventory).toHaveLength(0);
    });

    it('장착 카드가 초기화된다', () => {
      let run = createRunState(makeParty(), 42);
      run = selectCardReward(run, makeDummyCard('c1'));
      run = equipCard(run, run.party[0].id, 0, 'c1');

      const ended = endRun(run);

      expect(Object.keys(ended.equippedCards)).toHaveLength(0);
    });

    it('파티가 런 시작 시 스냅샷으로 복원된다', () => {
      let run = createRunState(makeParty(), 42);
      const originalNames = run.preRunPartySnapshot.map((d) => d.name);

      const ended = endRun(run);

      expect(ended.party.map((d) => d.name)).toEqual(originalNames);
    });

    it('골드는 유지된다', () => {
      let run = createRunState(makeParty(), 42);
      run = { ...run, gold: 500 };

      const ended = endRun(run);

      expect(ended.gold).toBe(500);
    });
  });

  // ═══════════════════════════════════════════
  // 9. 편성 조회 헬퍼
  // ═══════════════════════════════════════════

  describe('편성 조회 헬퍼', () => {
    it('getEquippableCards: 클래스 호환 카드만 반환', () => {
      let run = createRunState(makeParty(), 42);
      run = selectCardReward(run, makeDummyCard('universal'));
      run = selectCardReward(run, makeDummyCard('warrior_card', CharacterClass.WARRIOR));
      run = selectCardReward(run, makeDummyCard('archer_card', CharacterClass.ARCHER));

      const warriorId = run.party[0].id;
      const equippable = getEquippableCards(run, warriorId);

      const ids = equippable.map((c) => c.instanceId);
      expect(ids).toContain('universal');
      expect(ids).toContain('warrior_card');
      expect(ids).not.toContain('archer_card');
    });

    it('getEquippableCards: 이미 장착된 카드는 제외', () => {
      let run = createRunState(makeParty(), 42);
      run = selectCardReward(run, makeDummyCard('c1'));
      run = selectCardReward(run, makeDummyCard('c2'));

      const charId = run.party[0].id;
      run = equipCard(run, charId, 0, 'c1');

      const equippable = getEquippableCards(run, charId);
      const ids = equippable.map((c) => c.instanceId);
      expect(ids).not.toContain('c1');
      expect(ids).toContain('c2');
    });

    it('getEffectiveActionSlots: 장착 카드 반영', () => {
      let run = createRunState(makeParty(), 42);
      const card = makeDummyCard('c1');
      run = selectCardReward(run, card);

      const charId = run.party[0].id;
      run = equipCard(run, charId, 0, 'c1');

      const slots = getEffectiveActionSlots(run, charId);
      expect(slots[0].action.id).toBe('action_c1');
      // 나머지 슬롯은 기본 액션
      expect(slots[1].action.id).not.toBe('action_c1');
    });

    it('getEffectiveActionSlots: 장착 없으면 기본 슬롯', () => {
      const run = createRunState(makeParty(), 42);
      const charId = run.party[0].id;

      const slots = getEffectiveActionSlots(run, charId);
      expect(slots).toHaveLength(3);
      expect(slots[0].action.isBasic).toBe(true);
    });
  });

  // ═══════════════════════════════════════════
  // 10. 전체 런 흐름 통합 테스트
  // ═══════════════════════════════════════════

  describe('전체 런 흐름', () => {
    it('5스테이지 런을 처음부터 끝까지 실행할 수 있다', () => {
      let run = createRunState(makeParty(), 42);

      for (let stage = 1; stage <= 5; stage++) {
        // 전투
        const { battleState, victory } = executeStageBattle(run);

        if (victory) {
          // 보상
          const { runState, reward } = processVictory(run, battleState);
          run = runState;

          // 카드 선택 (첫 번째 옵션)
          if (reward.cardOptions.length > 0) {
            run = selectCardReward(run, reward.cardOptions[0]);
          }

          // 다음 스테이지
          if (stage < 5) {
            run = advanceStage(run);
          } else {
            run = advanceStage(run); // 마지막 스테이지 → 승리
          }
        } else {
          // 패배 → 재도전
          run = processDefeat(run);
          if (run.status === RunStatus.DEFEAT) break;

          // 재도전 (같은 스테이지)
          const retry = executeStageBattle(run);
          if (retry.victory) {
            const { runState, reward } = processVictory(run, retry.battleState);
            run = runState;
            if (reward.cardOptions.length > 0) {
              run = selectCardReward(run, reward.cardOptions[0]);
            }
            if (stage < 5) run = advanceStage(run);
            else run = advanceStage(run);
          } else {
            run = processDefeat(run);
            break;
          }
        }
      }

      // 런이 정상적으로 종료됨
      expect([RunStatus.VICTORY, RunStatus.DEFEAT]).toContain(run.status);
    });
  });
});
