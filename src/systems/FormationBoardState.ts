import { Position } from '../types';
import type { CharacterDefinition } from '../types';
import type { FormationData } from '../core/GameState';

export function getCharactersInBoardZone(
  formation: FormationData,
  characters: CharacterDefinition[],
  zoneKey: 'FRONT' | 'BACK',
): CharacterDefinition[] {
  const position = zoneKey === 'FRONT' ? Position.FRONT : Position.BACK;
  const characterMap = new Map(characters.map((character) => [character.id, character]));

  return formation.slots
    .filter((slot: FormationData['slots'][number]) => slot.characterId && slot.position === position)
    .map((slot: FormationData['slots'][number]) => characterMap.get(slot.characterId))
    .filter((character: CharacterDefinition | undefined): character is CharacterDefinition => !!character);
}

export function getBoardSlotMarkerStates(maxSlots: number, occupiedCount: number): boolean[] {
  return Array.from({ length: maxSlots }, (_, index) => index >= occupiedCount);
}
