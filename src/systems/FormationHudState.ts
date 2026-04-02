import type { ActionSlot, CharacterDefinition } from '../types';

export interface FormationSelectionHudCopy {
  meta: string;
  actionSlots: ActionSlot[];
  emptyText: string | null;
}

export function getFormationHeroHudText(heroName: string | null, isLocked: boolean): string {
  if (!heroName) return '';
  return isLocked ? `${heroName}  [LOCKED]` : heroName;
}

export function getFormationSelectionHudCopy(input: {
  character?: CharacterDefinition;
  zoneLabel?: string;
  actionSlots?: ActionSlot[];
}): FormationSelectionHudCopy {
  if (!input.character) {
    return {
      meta: '선택한 유닛 없음',
      actionSlots: [],
      emptyText: '로스터나 보드에서 유닛을 선택한 뒤 TACTICS에서 행동 카드를 조정하세요.',
    };
  }

  const { character, zoneLabel = 'UNASSIGNED', actionSlots = character.baseActionSlots } = input;
  const stats = character.baseStats;

  return {
    meta: `${character.name} / ${character.characterClass}  HP ${stats.hp}  ATK ${stats.atk}  GRD ${stats.grd}  AGI ${stats.agi}  LINE ${zoneLabel}`,
    actionSlots,
    emptyText: null,
  };
}
