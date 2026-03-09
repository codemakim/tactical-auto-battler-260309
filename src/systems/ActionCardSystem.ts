import type { Action, CharacterClass, BattleUnit, ActionCondition } from '../types';

/**
 * 클래스에 호환되는 액션 필터링
 * classRestriction이 없는 범용 액션 + 해당 클래스 전용 액션만 반환
 */
export function filterActionsByClass(actions: Action[], characterClass: CharacterClass): Action[] {
  return actions.filter(
    (action) => !action.classRestriction || action.classRestriction === characterClass
  );
}

/**
 * 시드 기반 간단한 난수 생성 (결정론적)
 */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    // mulberry32
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 보상 옵션 생성 (풀에서 클래스에 맞는 액션 count개 선택)
 * Fisher-Yates 셔플 후 앞에서 count개 추출
 */
export function generateRewardOptions(
  pool: Action[],
  characterClass: CharacterClass,
  count: number,
  seed: number,
): Action[] {
  const compatible = filterActionsByClass(pool, characterClass);

  // 풀이 count보다 작으면 가능한 만큼만 반환
  const pickCount = Math.min(count, compatible.length);
  if (pickCount === 0) return [];

  // 셔플용 복사본
  const shuffled = [...compatible];
  const rand = seededRandom(seed);

  // Fisher-Yates shuffle (부분: pickCount만큼만)
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, pickCount);
}

/**
 * 액션 슬롯 교체
 * 마지막 슬롯(기본 액션)은 교체 불가 → null 반환
 * 유효하지 않은 인덱스도 null 반환
 * 불변성: 새 BattleUnit 객체 반환
 */
export function replaceActionSlot(
  unit: BattleUnit,
  slotIndex: number,
  newAction: Action,
  newCondition: ActionCondition,
): BattleUnit | null {
  const lastIndex = unit.actionSlots.length - 1;

  // 유효하지 않은 인덱스 또는 마지막 슬롯(기본 액션) 교체 시도
  if (slotIndex < 0 || slotIndex >= unit.actionSlots.length || slotIndex === lastIndex) {
    return null;
  }

  const newSlots = unit.actionSlots.map((slot, i) =>
    i === slotIndex ? { condition: newCondition, action: newAction } : { ...slot }
  );

  return {
    ...unit,
    actionSlots: newSlots,
  };
}

/**
 * 런 리셋: 기본 액션만 남기고 임시 액션 제거
 * 기본 액션은 actionSlots의 마지막 슬롯 (isBasic: true)
 * 스탯은 변경하지 않음
 */
export function resetRunActions(unit: BattleUnit): BattleUnit {
  const basicSlot = unit.actionSlots.find((slot) => slot.action.isBasic);

  // 기본 액션이 없으면 빈 슬롯으로 (방어적 처리)
  const resetSlots = basicSlot ? [{ ...basicSlot }] : [];

  return {
    ...unit,
    actionSlots: resetSlots,
  };
}
