import type { CharacterDefinition, BattleUnit, ActionSlot } from '../types';
import { Team, Position } from '../types';
import { CLASS_TEMPLATES } from '../data/ClassDefinitions';
import type { CharacterClass } from '../types';

let unitCounter = 0;

/**
 * 고유 ID 생성
 */
function nextId(team: Team, name: string): string {
  return `${team}_${unitCounter++}_${name.toLowerCase().replace(/\s+/g, '_')}`;
}

/**
 * 클래스 템플릿에서 CharacterDefinition 생성
 */
export function createCharacterDef(
  name: string,
  characterClass: CharacterClass,
  trainingLevel: number = 0,
): CharacterDefinition {
  const template = CLASS_TEMPLATES[characterClass];

  return {
    id: `char_${name.toLowerCase().replace(/\s+/g, '_')}`,
    name,
    characterClass,
    baseStats: { ...template.baseStats },
    basicAction: template.basicAction,
    trainingLevel,
  };
}

/**
 * CharacterDefinition → BattleUnit 변환
 */
export function createUnit(
  def: CharacterDefinition,
  team: Team,
  position: Position,
  extraSlots: ActionSlot[] = [],
): BattleUnit {
  // 훈련 보너스 적용
  const trainedStats = applyTrainingBonuses(def);

  return {
    id: nextId(team, def.name),
    definitionId: def.id,
    name: def.name,
    characterClass: def.characterClass,
    team,
    position,
    stats: {
      hp: trainedStats.hp,
      maxHp: trainedStats.hp,
      atk: trainedStats.atk,
      def: trainedStats.def,
      agi: trainedStats.agi,
    },
    shield: 0,
    actionSlots: [
      ...extraSlots,
      // 기본 액션은 항상 마지막 (fallback)
      { condition: { type: 'ALWAYS' }, action: def.basicAction },
    ],
    isAlive: true,
    hasActedThisRound: false,
  };
}

/**
 * 훈련 레벨에 따른 스탯 보너스 계산
 */
function applyTrainingBonuses(def: CharacterDefinition): {
  hp: number; atk: number; def: number; agi: number;
} {
  const base = def.baseStats;
  let hp = base.hp;
  let atk = base.atk;
  let defStat = base.def;
  let agi = base.agi;

  // 훈련 레벨당 소량의 스탯 증가 (레벨에 따라 순환)
  for (let i = 1; i <= def.trainingLevel; i++) {
    const mod = i % 3;
    if (mod === 1) atk += 1;
    else if (mod === 2) hp += 3;
    else agi += 1;
  }

  return { hp, atk, def: defStat, agi };
}

/**
 * 카운터 리셋 (테스트용)
 */
export function resetUnitCounter(): void {
  unitCounter = 0;
}
