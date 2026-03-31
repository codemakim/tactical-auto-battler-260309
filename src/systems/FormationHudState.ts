import type { CharacterDefinition } from '../types';

export interface FormationSelectionHudCopy {
  meta: string;
  tactics: string;
}

export function getFormationHeroHudText(heroName: string | null, isLocked: boolean): string {
  if (!heroName) return '';
  return isLocked ? `${heroName}  [LOCKED]` : heroName;
}

export function getFormationSelectionHudCopy(input: {
  character?: CharacterDefinition;
  zoneLabel?: string;
  actionNames?: string[];
}): FormationSelectionHudCopy {
  if (!input.character) {
    return {
      meta: '선택한 유닛 없음',
      tactics: '로스터나 보드에서 유닛을 선택한 뒤 TACTICS에서 행동 카드를 조정하세요.',
    };
  }

  const { character, zoneLabel = 'UNASSIGNED', actionNames = [] } = input;
  const stats = character.baseStats;

  return {
    meta: `${character.name} / ${character.characterClass}  HP ${stats.hp}  ATK ${stats.atk}  GRD ${stats.grd}  AGI ${stats.agi}  LINE ${zoneLabel}`,
    tactics: actionNames.map((name, index) => `${index + 1}. ${name}`).join('   '),
  };
}
