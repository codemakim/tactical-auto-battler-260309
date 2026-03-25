/**
 * 전투 이벤트 → 플로팅 텍스트 데이터 변환 (순수 함수)
 */

import type { BattleEvent, FloatingTextData } from '../types';

/**
 * 배틀 이벤트 배열에서 플로팅 텍스트로 표시할 데이터를 추출한다.
 */
export function extractFloatingTexts(events: BattleEvent[]): FloatingTextData[] {
  const result: FloatingTextData[] = [];

  for (const ev of events) {
    switch (ev.type) {
      case 'DAMAGE_DEALT':
        if (ev.targetId && ev.value != null) {
          result.push({ type: 'DAMAGE', value: ev.value, targetUnitId: ev.targetId });
        }
        break;
      case 'SHIELD_APPLIED':
        if (ev.targetId && ev.value != null) {
          result.push({ type: 'SHIELD', value: ev.value, targetUnitId: ev.targetId });
        }
        break;
      case 'HEAL_APPLIED':
        if (ev.targetId && ev.value != null) {
          result.push({ type: 'HEAL', value: ev.value, targetUnitId: ev.targetId });
        }
        break;
      case 'UNIT_DIED':
        if (ev.targetId) {
          result.push({ type: 'DEATH', targetUnitId: ev.targetId });
        }
        break;
      case 'BUFF_APPLIED':
        if (ev.targetId) {
          const buffName = (ev.data?.buffType as string) ?? 'BUFF';
          result.push({ type: 'BUFF', label: buffName, targetUnitId: ev.targetId });
        }
        break;
      case 'DEBUFF_APPLIED':
        if (ev.targetId) {
          const debuffName = (ev.data?.buffType as string) ?? 'DEBUFF';
          result.push({ type: 'DEBUFF', label: debuffName, targetUnitId: ev.targetId });
        }
        break;
    }
  }

  return result;
}
