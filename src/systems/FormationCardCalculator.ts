/**
 * 편성 화면 카드 표시 데이터 계산 + 슬롯 순서 변경 (순수 함수)
 */

import type { CharacterDefinition, RunState, SlotDisplayData, CardInstance } from '../types';

/**
 * 캐릭터의 액션 슬롯을 표시 데이터로 변환
 *
 * @param charDef - 캐릭터 정의
 * @param runState - 런 상태 (없으면 기본 슬롯만 반환)
 * @returns 각 슬롯의 표시 데이터 배열
 */
export function getSlotDisplayData(charDef: CharacterDefinition, runState: RunState | undefined): SlotDisplayData[] {
  return charDef.baseActionSlots.map((baseSlot, i) => {
    // 런 상태 없으면 기본 슬롯
    if (!runState) {
      return {
        slotIndex: i,
        action: baseSlot.action,
        condition: baseSlot.condition,
        equippedCard: null,
        isBase: true,
      };
    }

    // 장착된 카드 확인
    const equipped = runState.equippedCards[charDef.id];
    const cardInstanceId = equipped?.[i];

    if (!cardInstanceId) {
      return {
        slotIndex: i,
        action: baseSlot.action,
        condition: baseSlot.condition,
        equippedCard: null,
        isBase: true,
      };
    }

    const card = runState.cardInventory.find((c) => c.instanceId === cardInstanceId);
    if (!card) {
      return {
        slotIndex: i,
        action: baseSlot.action,
        condition: baseSlot.condition,
        equippedCard: null,
        isBase: true,
      };
    }

    return {
      slotIndex: i,
      action: card.action,
      condition: baseSlot.condition,
      equippedCard: card,
      isBase: false,
    };
  });
}

/**
 * 마을 모드: CharacterDefinition의 baseActionSlots 순서 교환
 *
 * @returns 새 CharacterDefinition (불변)
 */
export function swapBaseActionSlots(charDef: CharacterDefinition, indexA: number, indexB: number): CharacterDefinition {
  if (indexA === indexB) return charDef;
  if (indexA < 0 || indexA >= charDef.baseActionSlots.length) return charDef;
  if (indexB < 0 || indexB >= charDef.baseActionSlots.length) return charDef;

  const newSlots = [...charDef.baseActionSlots];
  const temp = newSlots[indexA];
  newSlots[indexA] = newSlots[indexB];
  newSlots[indexB] = temp;

  return { ...charDef, baseActionSlots: newSlots };
}

/**
 * 런 모드: party 내 CharDef의 baseActionSlots + equippedCards 매핑 동시 교환
 *
 * @returns 새 RunState (불변)
 */
export function swapRunActionSlots(runState: RunState, charDefId: string, indexA: number, indexB: number): RunState {
  if (indexA === indexB) return runState;

  // party에서 캐릭터 찾기
  const charIdx = runState.party.findIndex((c) => c.id === charDefId);
  if (charIdx === -1) return runState;

  const charDef = runState.party[charIdx];
  if (indexA < 0 || indexA >= charDef.baseActionSlots.length) return runState;
  if (indexB < 0 || indexB >= charDef.baseActionSlots.length) return runState;

  // baseActionSlots 교환
  const newSlots = [...charDef.baseActionSlots];
  const temp = newSlots[indexA];
  newSlots[indexA] = newSlots[indexB];
  newSlots[indexB] = temp;

  const newParty = [...runState.party];
  newParty[charIdx] = { ...charDef, baseActionSlots: newSlots };

  // equippedCards 매핑 교환
  const charEquipped = runState.equippedCards[charDefId];
  let newEquippedCards = runState.equippedCards;

  if (charEquipped) {
    const newCharEquipped = { ...charEquipped };
    const cardA = newCharEquipped[indexA];
    const cardB = newCharEquipped[indexB];

    // 둘 다 없으면 변경 불필요
    delete newCharEquipped[indexA];
    delete newCharEquipped[indexB];
    if (cardA) newCharEquipped[indexB] = cardA;
    if (cardB) newCharEquipped[indexA] = cardB;

    newEquippedCards = { ...runState.equippedCards, [charDefId]: newCharEquipped };
  }

  return { ...runState, party: newParty, equippedCards: newEquippedCards };
}
