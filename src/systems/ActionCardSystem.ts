import type {
  Action,
  ActionEffect,
  CharacterClass,
  BattleUnit,
  ActionCondition,
  CardTemplate,
  ActionTargetType,
  ActionSlot,
  Rarity,
} from '../types';

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

function resolveTemplateCondition(template: CardTemplate, rand: () => number): ActionCondition {
  if (!template.conditionValuePool?.length || template.condition.value === undefined) {
    return { ...template.condition };
  }

  const value = template.conditionValuePool[Math.floor(rand() * template.conditionValuePool.length)];
  return { ...template.condition, value };
}

/**
 * 카드 템플릿에서 변형 액션 생성.
 * 각 효과의 multiplierPool, targetPool에서 시드 기반으로 하나씩 선택.
 * description은 효과들로부터 자동 생성.
 */
export function generateCardVariant(template: CardTemplate, seed: number): Action {
  const rand = seededRandom(seed);

  const effects: ActionEffect[] = template.effectTemplates.map((et) => {
    const multiplier = et.multiplierPool[Math.floor(rand() * et.multiplierPool.length)];
    const target: ActionTargetType = et.targetPool[Math.floor(rand() * et.targetPool.length)];

    const effect: ActionEffect = { type: et.type, target };
    if (multiplier !== 0) effect.value = multiplier;
    if (et.stat) effect.stat = et.stat;
    if (et.position) effect.position = et.position;
    if (et.buffType) effect.buffType = et.buffType;
    if (et.duration !== undefined) effect.duration = et.duration;
    if (et.swapTarget) effect.swapTarget = et.swapTarget;

    return effect;
  });

  return {
    id: `${template.id}_v${seed}`,
    name: template.name,
    description: buildDescription(template.name, effects),
    effects,
    rarity: template.rarity,
    classRestriction: template.classRestriction,
    ...(template.defensivePriority && { defensivePriority: true }),
  };
}

/** 효과 목록으로부터 간단한 설명 자동 생성 */
function buildDescription(name: string, effects: ActionEffect[]): string {
  const parts: string[] = [];
  for (const e of effects) {
    switch (e.type) {
      case 'DAMAGE':
        parts.push(`Deal ATK x${e.value ?? 1.0} damage`);
        break;
      case 'SHIELD':
        parts.push(`Gain GRD x${e.value ?? 1.0} shield`);
        break;
      case 'HEAL':
        parts.push(`Heal ${e.value ?? 0}`);
        break;
      case 'PUSH':
        parts.push('Push target');
        break;
      case 'MOVE':
        parts.push(`Move to ${e.position ?? 'FRONT'}`);
        break;
      case 'BUFF':
      case 'DEBUFF':
        parts.push(`Apply ${e.buffType ?? 'effect'}`);
        break;
      case 'DELAY_TURN':
        parts.push('Delay target turn');
        break;
      case 'ADVANCE_TURN':
        parts.push('Advance own turn');
        break;
      case 'SWAP':
        parts.push('Swap target positions');
        break;
      default:
        break;
    }
  }
  return parts.join('. ') + '.';
}

/**
 * 카드 템플릿 풀에서 클래스에 맞는 변형 액션들을 생성.
 * 기존 generateRewardOptions의 템플릿 버전.
 */
export function generateRewardFromTemplates(
  templates: CardTemplate[],
  characterClass: CharacterClass | undefined,
  count: number,
  seed: number,
): Action[] {
  // 클래스 호환 필터 (characterClass가 undefined면 모든 템플릿 사용 — 파티 전체 풀)
  const compatible = characterClass
    ? templates.filter((t) => !t.classRestriction || t.classRestriction === characterClass)
    : templates;

  const pickCount = Math.min(count, compatible.length);
  if (pickCount === 0) return [];

  const rand = seededRandom(seed);

  // Fisher-Yates shuffle
  const shuffled = [...compatible];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 각 템플릿마다 고유 시드로 변형 생성
  return shuffled.slice(0, pickCount).map((t, i) => generateCardVariant(t, seed + i + 1));
}

/** 희귀도별 가중치 */
const RARITY_WEIGHTS: Record<string, number> = {
  COMMON: 10,
  RARE: 3,
  EPIC: 1,
  LEGENDARY: 0.5,
};

/**
 * 카드 템플릿 풀에서 가중치 기반으로 초기 액션 슬롯 추첨.
 * 캐릭터 생성 시 cardTemplates에서 count장을 중복 없이 뽑아 ActionSlot[]로 반환.
 */
export function drawInitialCards(templates: CardTemplate[], count: number, seed: number): ActionSlot[] {
  const rand = seededRandom(seed);
  const remaining = [...templates];
  const result: ActionSlot[] = [];

  for (let i = 0; i < count && remaining.length > 0; i++) {
    const totalWeight = remaining.reduce((sum, t) => {
      const rarity = t.rarity ?? 'COMMON';
      return sum + (RARITY_WEIGHTS[rarity] ?? 10);
    }, 0);

    let roll = rand() * totalWeight;
    let picked = remaining.length - 1;
    for (let j = 0; j < remaining.length; j++) {
      const rarity = remaining[j].rarity ?? 'COMMON';
      roll -= RARITY_WEIGHTS[rarity] ?? 10;
      if (roll <= 0) {
        picked = j;
        break;
      }
    }

    const template = remaining[picked];
    // 같은 name의 변형 템플릿도 모두 제거 (Execution Cut COMMON/RARE 등 중복 방지)
    const pickedName = template.name;
    for (let k = remaining.length - 1; k >= 0; k--) {
      if (remaining[k].name === pickedName) remaining.splice(k, 1);
    }

    const action = generateCardVariant(template, seed + i + 1);
    result.push({ condition: resolveTemplateCondition(template, rand), action });
  }

  return result;
}

/**
 * 액션 슬롯 교체.
 * §6: 런 중 획득한 액션으로 기존 3개 슬롯 중 어떤 슬롯이든 교체 가능.
 * 유효하지 않은 인덱스이면 null 반환.
 * 불변성: 새 BattleUnit 객체 반환.
 */
export function replaceActionSlot(
  unit: BattleUnit,
  slotIndex: number,
  newAction: Action,
  newCondition: ActionCondition,
): BattleUnit | null {
  // 유효하지 않은 인덱스
  if (slotIndex < 0 || slotIndex >= unit.actionSlots.length) {
    return null;
  }

  const newSlots = unit.actionSlots.map((slot, i) =>
    i === slotIndex ? { condition: newCondition, action: newAction } : { ...slot },
  );

  return {
    ...unit,
    actionSlots: newSlots,
  };
}

/**
 * 런 리셋: baseActionSlots로 액션 슬롯 복원.
 * 런 중 교체한 액션은 모두 제거되고 캐릭터 원래 3개 슬롯으로 돌아온다.
 * 스탯은 변경하지 않음.
 */
export function resetRunActions(unit: BattleUnit): BattleUnit {
  return {
    ...unit,
    actionSlots: unit.baseActionSlots.map((slot) => ({ ...slot })),
  };
}

/**
 * 전투 종료 후 복원: preBattleActionSlots → actionSlots.
 * 전투 중 영웅이 편집한 액션 카드를 전투 시작 전 상태로 되돌린다.
 * preBattleActionSlots가 없으면 변경 없이 반환.
 */
export function resetBattleActions(unit: BattleUnit): BattleUnit {
  if (!unit.preBattleActionSlots) return unit;
  return {
    ...unit,
    actionSlots: unit.preBattleActionSlots.map((slot) => ({ ...slot })),
    preBattleActionSlots: undefined,
  };
}
