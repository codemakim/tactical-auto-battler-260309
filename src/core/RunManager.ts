/**
 * 런 루프 매니저
 * run-system-spec.md 기반
 *
 * 순수 함수: 모든 함수는 새 RunState를 반환 (불변성)
 */

import type {
  RunState,
  CharacterDefinition,
  CardInstance,
  BattleState,
  BattleReward,
  HeroType,
  ActionSlot,
  BattlefieldId,
} from '../types';
import { RunStatus, Team, Position } from '../types';
import { createUnit, resetUnitCounter } from '../entities/UnitFactory';
import { createBattleState, runFullBattle, restorePreBattleActions } from './BattleEngine';
import { generateEncounter } from '../systems/EnemyGenerator';
import { generateBattleRewards } from '../systems/BattleRewardSystem';
import { DEFAULT_GAME_CONFIG } from '../types';

// ═══════════════════════════════════════════
// 런 생성
// ═══════════════════════════════════════════

/**
 * 새 런 생성
 * 파티 4명을 선택하여 런을 시작
 */
export function createRunState(
  party: CharacterDefinition[],
  seed: number,
  battlefieldId: BattlefieldId = 'plains',
): RunState {
  if (party.length !== 4) {
    throw new Error(`파티는 4명이어야 합니다. 현재: ${party.length}명`);
  }

  return {
    battlefieldId,
    currentStage: 1,
    maxStages: DEFAULT_GAME_CONFIG.runStages,
    seed,
    party: party.map((def) => ({ ...def })),
    cardInventory: [],
    equippedCards: {},
    gold: 0,
    retryAvailable: true,
    status: RunStatus.IN_PROGRESS,
    preRunPartySnapshot: party.map((def) => ({
      ...def,
      baseActionSlots: def.baseActionSlots.map((s) => ({ ...s })),
    })),
  };
}

// ═══════════════════════════════════════════
// 전투 실행
// ═══════════════════════════════════════════

/** 전투 결과 */
export interface BattleOutcome {
  battleState: BattleState;
  victory: boolean;
}

/**
 * 현재 스테이지 전투용 BattleState 생성 (실행 없음)
 * Scene에서 stepBattle()로 한 턴씩 진행할 때 사용.
 * 풀피 리셋 적용 (run-system-spec §7)
 */
export function createStageBattleState(
  runState: RunState,
  heroType?: HeroType,
  formationSlots?: Array<{ characterId: string; position: Position }>,
): BattleState {
  resetUnitCounter();

  const battleSeed = runState.seed + runState.currentStage * 1000;

  // 파티 → BattleUnit (풀피, 4명 전원 출전)
  // formationSlots가 있으면 편성 화면에서 설정한 포지션 사용
  const playerUnits = runState.party.map((def, i) => {
    let pos = i < 2 ? Position.FRONT : Position.BACK; // 폴백
    if (formationSlots) {
      const slot = formationSlots.find((s) => s.characterId === def.id);
      if (slot) pos = slot.position;
    }
    const unit = createUnit(def, Team.PLAYER, pos);
    return applyEquippedCards(unit, def.id, runState);
  });

  // 적 생성
  const enemyEncounter = generateEncounter(runState.currentStage, battleSeed);
  const enemyUnits = enemyEncounter.map((eu) => createUnit(eu.definition, Team.ENEMY, eu.position));

  return createBattleState(playerUnits, enemyUnits, battleSeed, heroType);
}

/**
 * 현재 스테이지 전투 실행 (한번에 완료)
 * 시뮬레이션용. Scene에서는 createStageBattleState() 사용.
 */
export function executeStageBattle(runState: RunState, heroType?: HeroType): BattleOutcome {
  const initialState = createStageBattleState(runState, heroType);
  let finalState = runFullBattle(initialState);
  finalState = restorePreBattleActions(finalState);

  return {
    battleState: finalState,
    victory: finalState.winner === Team.PLAYER,
  };
}

/**
 * 장착된 카드를 BattleUnit의 actionSlots에 반영
 */
function applyEquippedCards(
  unit: import('../types').BattleUnit,
  defId: string,
  runState: RunState,
): import('../types').BattleUnit {
  const equipped = runState.equippedCards[defId];
  if (!equipped) return unit;

  const newSlots = unit.actionSlots.map((slot, i) => {
    const cardId = equipped[i];
    if (!cardId) return slot;

    const card = runState.cardInventory.find((c) => c.instanceId === cardId);
    if (!card) return slot;

    return {
      condition: slot.condition,
      action: card.action,
    };
  });

  return { ...unit, actionSlots: newSlots };
}

// ═══════════════════════════════════════════
// 전투 결과 처리
// ═══════════════════════════════════════════

/** 보상 페이즈 결과 */
export interface RewardResult {
  runState: RunState;
  reward: BattleReward;
}

/**
 * 승리 시 보상 생성 + 골드 적용
 * 카드는 아직 선택 전 (옵션만 생성)
 */
export function processVictory(runState: RunState, battleState: BattleState): RewardResult {
  const rewardSeed = runState.seed + runState.currentStage * 2000;
  const partyClasses = runState.party.map((def) => def.characterClass);

  // 보상 생성
  const reward = generateBattleRewards(battleState, partyClasses, rewardSeed);

  // 골드 적용
  const newRunState: RunState = { ...runState, gold: runState.gold + reward.gold };

  return { runState: newRunState, reward };
}

/**
 * 패배 처리
 * 재도전 가능하면 retryAvailable 소모, 불가하면 런 종료
 */
export function processDefeat(runState: RunState): RunState {
  if (runState.retryAvailable) {
    return { ...runState, retryAvailable: false };
  }
  // 2번째 패배 → 런 실패
  return endRun({ ...runState, status: RunStatus.DEFEAT });
}

// ═══════════════════════════════════════════
// 카드 선택 (보상에서)
// ═══════════════════════════════════════════

/**
 * 보상에서 카드 1개 선택 → 인벤토리에 추가
 */
export function selectCardReward(runState: RunState, card: CardInstance): RunState {
  return {
    ...runState,
    cardInventory: [...runState.cardInventory, card],
  };
}

// ═══════════════════════════════════════════
// 편성 관리 (전투 사이)
// ═══════════════════════════════════════════

/**
 * 카드 장착: 인벤토리 카드 → 캐릭터 슬롯에 덮어씌움
 * 이미 장착된 카드가 있으면 기존 카드는 자동으로 해제됨
 */
export function equipCard(
  runState: RunState,
  characterDefId: string,
  slotIndex: number,
  cardInstanceId: string,
): RunState {
  // 카드 존재 확인
  const card = runState.cardInventory.find((c) => c.instanceId === cardInstanceId);
  if (!card) return runState;

  // 슬롯 범위 확인
  if (slotIndex < 0 || slotIndex > 2) return runState;

  // 클래스 호환 확인
  const charDef = runState.party.find((d) => d.id === characterDefId);
  if (!charDef) return runState;
  if (card.classRestriction && card.classRestriction !== charDef.characterClass) return runState;

  // 기존 장착 해제 (같은 슬롯에 다른 카드가 있으면)
  const charEquipped = { ...(runState.equippedCards[characterDefId] ?? {}) };
  charEquipped[slotIndex] = cardInstanceId;

  // 다른 캐릭터에서 같은 카드가 장착되어 있으면 해제
  const newEquippedCards = { ...runState.equippedCards };
  for (const [defId, slots] of Object.entries(newEquippedCards)) {
    if (defId === characterDefId) continue;
    const newSlots = { ...slots };
    for (const [idx, cid] of Object.entries(newSlots)) {
      if (cid === cardInstanceId) {
        delete newSlots[Number(idx)];
      }
    }
    newEquippedCards[defId] = newSlots;
  }
  newEquippedCards[characterDefId] = charEquipped;

  return { ...runState, equippedCards: newEquippedCards };
}

/**
 * 카드 해제: 슬롯에서 카드 제거 → 기본 액션 복원
 */
export function unequipCard(runState: RunState, characterDefId: string, slotIndex: number): RunState {
  const charEquipped = runState.equippedCards[characterDefId];
  if (!charEquipped || !charEquipped[slotIndex]) return runState;

  const newSlots = { ...charEquipped };
  delete newSlots[slotIndex];

  return {
    ...runState,
    equippedCards: {
      ...runState.equippedCards,
      [characterDefId]: newSlots,
    },
  };
}

// ═══════════════════════════════════════════
// 스테이지 진행
// ═══════════════════════════════════════════

/**
 * 다음 스테이지로 진행
 * 재도전 가능 횟수 복원
 */
export function advanceStage(runState: RunState): RunState {
  const nextStage = runState.currentStage + 1;

  // 마지막 스테이지 클리어 → 런 승리
  if (runState.currentStage >= runState.maxStages) {
    return endRun({ ...runState, status: RunStatus.VICTORY });
  }

  return {
    ...runState,
    currentStage: nextStage,
    retryAvailable: true,
  };
}

// ═══════════════════════════════════════════
// 런 종료
// ═══════════════════════════════════════════

/**
 * 런 종료 처리 (run-system-spec §8)
 * - 장착 카드 제거 (기본 액션 자동 복원)
 * - 인벤토리 초기화
 * - 파티를 런 시작 시 스냅샷으로 복원
 */
export function endRun(runState: RunState): RunState {
  return {
    ...runState,
    party: runState.preRunPartySnapshot.map((def) => ({
      ...def,
      baseActionSlots: def.baseActionSlots.map((s) => ({ ...s })),
    })),
    cardInventory: [],
    equippedCards: {},
    // gold는 유지 (런 밖 성장 자원)
  };
}

// ═══════════════════════════════════════════
// 편성 조회 헬퍼
// ═══════════════════════════════════════════

/**
 * 캐릭터에 장착 가능한 카드 목록 반환
 * (공용 + 해당 클래스 카드, 이미 다른 캐릭터에 장착된 카드 제외)
 */
export function getEquippableCards(runState: RunState, characterDefId: string): CardInstance[] {
  const charDef = runState.party.find((d) => d.id === characterDefId);
  if (!charDef) return [];

  // 이미 장착된 카드 ID 수집
  const equippedCardIds = new Set<string>();
  for (const slots of Object.values(runState.equippedCards)) {
    for (const cardId of Object.values(slots)) {
      equippedCardIds.add(cardId);
    }
  }

  return runState.cardInventory.filter((card) => {
    // 이미 장착된 카드 제외
    if (equippedCardIds.has(card.instanceId)) return false;
    // 클래스 호환 확인
    if (card.classRestriction && card.classRestriction !== charDef.characterClass) return false;
    return true;
  });
}

/**
 * 캐릭터의 현재 실효 액션 슬롯 반환
 * (기본 슬롯 + 장착 카드 오버라이드 반영)
 */
export function getEffectiveActionSlots(runState: RunState, characterDefId: string): ActionSlot[] {
  const charDef = runState.party.find((d) => d.id === characterDefId);
  if (!charDef) return [];

  const equipped = runState.equippedCards[characterDefId];
  return charDef.baseActionSlots.map((baseSlot, i) => {
    if (!equipped || !equipped[i]) return baseSlot;

    const card = runState.cardInventory.find((c) => c.instanceId === equipped[i]);
    if (!card) return baseSlot;

    return { condition: baseSlot.condition, action: card.action };
  });
}
