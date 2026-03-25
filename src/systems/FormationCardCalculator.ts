/**
 * 편성 화면 카드 표시 데이터 계산 (순수 함수)
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
