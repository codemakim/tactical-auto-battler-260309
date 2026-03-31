import type { CharacterDefinition } from '../types';

export interface FormationRosterEntry {
  character: CharacterDefinition;
  isAssigned: boolean;
  isSelected: boolean;
}

export function buildFormationRosterEntries(
  characters: CharacterDefinition[],
  formationIds: Set<string>,
  selectedCharacterId: string | null,
): FormationRosterEntry[] {
  return characters.map((character) => ({
    character,
    isAssigned: formationIds.has(character.id),
    isSelected: character.id === selectedCharacterId,
  }));
}
