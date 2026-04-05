import type { FormationData } from '../core/GameState';
import { Position } from '../types';

export type FormationZoneKey = 'FRONT' | 'BACK';

export interface FormationInteractionResult {
  formation: FormationData;
  changed: boolean;
  removedCharacterId?: string;
  reason?: 'formation-full';
}

function zoneToPosition(zone: FormationZoneKey) {
  return zone === 'FRONT' ? Position.FRONT : Position.BACK;
}

function getCharacterPosition(formation: FormationData, characterId: string): Position | null {
  return formation.slots.find((slot) => slot.characterId === characterId)?.position ?? null;
}

export function moveCharacterToZone(
  formation: FormationData,
  characterId: string,
  zone: FormationZoneKey,
): FormationInteractionResult {
  const targetPosition = zoneToPosition(zone);
  const existingPosition = getCharacterPosition(formation, characterId);

  if (existingPosition === targetPosition) {
    return { formation, changed: false };
  }

  const withoutCharacter = formation.slots.filter((slot) => slot.characterId !== characterId);
  if (!existingPosition && withoutCharacter.length >= 4) {
    return { formation, changed: false, reason: 'formation-full' };
  }

  return {
    formation: {
      ...formation,
      slots: [...withoutCharacter, { characterId, position: targetPosition }],
    },
    changed: true,
  };
}

export function removeCharacterFromFormation(
  formation: FormationData,
  characterId: string,
): FormationInteractionResult {
  const newSlots = formation.slots.filter((slot) => slot.characterId !== characterId);
  if (newSlots.length === formation.slots.length) {
    return { formation, changed: false };
  }

  return {
    formation: {
      ...formation,
      slots: newSlots,
    },
    changed: true,
    removedCharacterId: characterId,
  };
}

export function replaceCharacterInFormation(
  formation: FormationData,
  incomingCharacterId: string,
  outgoingCharacterId: string,
): FormationInteractionResult {
  const outgoingPosition = getCharacterPosition(formation, outgoingCharacterId);
  if (!outgoingPosition || incomingCharacterId === outgoingCharacterId) {
    return { formation, changed: false };
  }

  const newSlots = formation.slots.filter(
    (slot) => slot.characterId !== incomingCharacterId && slot.characterId !== outgoingCharacterId,
  );

  return {
    formation: {
      ...formation,
      slots: [...newSlots, { characterId: incomingCharacterId, position: outgoingPosition }],
    },
    changed: true,
    removedCharacterId: outgoingCharacterId,
  };
}

export function swapCharactersInFormation(
  formation: FormationData,
  firstCharacterId: string,
  secondCharacterId: string,
): FormationInteractionResult {
  const firstPosition = getCharacterPosition(formation, firstCharacterId);
  const secondPosition = getCharacterPosition(formation, secondCharacterId);
  if (!firstPosition || !secondPosition || firstCharacterId === secondCharacterId) {
    return { formation, changed: false };
  }

  const newSlots = formation.slots.map((slot) => {
    if (slot.characterId === firstCharacterId) {
      return { ...slot, position: secondPosition };
    }
    if (slot.characterId === secondCharacterId) {
      return { ...slot, position: firstPosition };
    }
    return slot;
  });

  return {
    formation: {
      ...formation,
      slots: newSlots,
    },
    changed: true,
  };
}
