/**
 * FormationValidator — 편성 유효성 검증 (순수 함수)
 *
 * 영역(zone) 기반 자유 배치 제약 검증:
 * - FRONT + BACK 합산 최대 3명
 * - RESERVE 최대 1명
 * - 같은 캐릭터 중복 배치 불가
 * - 최소 1명은 배치해야 출격 가능
 */
import type { FormationData } from '../core/GameState';

export interface FormationValidation {
  valid: boolean;
  errors: string[];
}

const MAX_COMBAT_UNITS = 3;
const MAX_RESERVE = 1;

export function validateFormation(formation: FormationData): FormationValidation {
  const errors: string[] = [];

  const activeSlots = formation.slots.filter((s) => s.characterId);

  // §1.1 최소 1명 배치
  if (activeSlots.length === 0) {
    errors.push('최소 1명은 배치해야 합니다');
  }

  // §1.1 FRONT + BACK 합산 최대 3명
  if (activeSlots.length > MAX_COMBAT_UNITS) {
    errors.push(`출전 인원은 최대 ${MAX_COMBAT_UNITS}명입니다 (현재 ${activeSlots.length}명)`);
  }

  // 중복 배치 불가
  const combatIds = activeSlots.map((s) => s.characterId);
  const reserveId = formation.reserveId;

  const allIds = [...combatIds];
  if (reserveId) allIds.push(reserveId);

  const seen = new Set<string>();
  for (const id of allIds) {
    if (seen.has(id)) {
      errors.push(`같은 캐릭터를 중복 배치할 수 없습니다 (${id})`);
    }
    seen.add(id);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 영역에 캐릭터를 추가할 수 있는지 확인
 * zone: 'FRONT' | 'BACK' | 'RESERVE'
 */
export function canAddToZone(
  formation: FormationData,
  zone: 'FRONT' | 'BACK' | 'RESERVE',
  characterId: string,
): { allowed: boolean; reason?: string } {
  // 이미 배치된 캐릭터인지 확인
  const allIds = formation.slots.filter((s) => s.characterId).map((s) => s.characterId);
  if (formation.reserveId) allIds.push(formation.reserveId);

  if (zone === 'RESERVE') {
    if (formation.reserveId && formation.reserveId !== characterId) {
      // 기존 reserve 교체는 허용 (호출 측에서 처리)
    }
    return { allowed: true };
  }

  // combat zone: FRONT + BACK 합산 체크
  const activeSlots = formation.slots.filter((s) => s.characterId);
  const isAlreadyInCombat = activeSlots.some((s) => s.characterId === characterId);

  if (!isAlreadyInCombat && activeSlots.length >= MAX_COMBAT_UNITS) {
    return { allowed: false, reason: `출전 인원이 이미 ${MAX_COMBAT_UNITS}명입니다` };
  }

  return { allowed: true };
}
