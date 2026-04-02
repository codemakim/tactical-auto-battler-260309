import { generateCharacterDef } from '../entities/UnitFactory';
import type { CharacterClass, CharacterDefinition } from '../types';
import { CharacterClass as CC } from '../types';

export const RECRUIT_OFFER_COUNT = 3 as const;
export const RECRUIT_OFFER_PRICE = 80 as const;
export const RECRUIT_REFRESH_COST = 20 as const;

interface RecruitTemplate {
  name: string;
  characterClass: CharacterClass;
  seed: number;
}

export interface RecruitShopOffer {
  slotIndex: number;
  character: CharacterDefinition | null;
  price: number;
}

export interface RecruitShopState {
  offers: RecruitShopOffer[];
  refreshCost: number;
  nextRotationOffset: number;
}

export type RecruitPurchaseFailureReason = 'not-enough-gold' | 'roster-full' | 'empty-slot';

export type RecruitPurchaseResult =
  | {
      ok: true;
      updatedShopState: RecruitShopState;
      updatedGold: number;
      recruitedCharacter: CharacterDefinition;
    }
  | {
      ok: false;
      reason: RecruitPurchaseFailureReason;
      updatedShopState: RecruitShopState;
      updatedGold: number;
    };

const RECRUIT_TEMPLATES: RecruitTemplate[] = [
  { name: 'Brakka', characterClass: CC.LANCER, seed: 101 },
  { name: 'Mira', characterClass: CC.CONTROLLER, seed: 102 },
  { name: 'Selene', characterClass: CC.ASSASSIN, seed: 103 },
  { name: 'Doran', characterClass: CC.GUARDIAN, seed: 104 },
  { name: 'Iris', characterClass: CC.ARCHER, seed: 105 },
  { name: 'Kael', characterClass: CC.WARRIOR, seed: 106 },
  { name: 'Nyx', characterClass: CC.CONTROLLER, seed: 107 },
  { name: 'Riven', characterClass: CC.LANCER, seed: 108 },
  { name: 'Talia', characterClass: CC.ASSASSIN, seed: 109 },
  { name: 'Boros', characterClass: CC.GUARDIAN, seed: 110 },
  { name: 'Elowen', characterClass: CC.ARCHER, seed: 111 },
  { name: 'Cassian', characterClass: CC.WARRIOR, seed: 112 },
];

function buildRecruitCharacter(template: RecruitTemplate): CharacterDefinition {
  return generateCharacterDef(template.name, template.characterClass, template.seed);
}

function getAvailableRecruitPool(roster: CharacterDefinition[]): CharacterDefinition[] {
  const ownedIds = new Set(roster.map((character) => character.id));
  return RECRUIT_TEMPLATES.map(buildRecruitCharacter).filter((character) => !ownedIds.has(character.id));
}

function rotateOffers(pool: CharacterDefinition[], offset: number): CharacterDefinition[] {
  if (pool.length === 0) return [];
  const start = ((offset % pool.length) + pool.length) % pool.length;
  return [...pool.slice(start), ...pool.slice(0, start)].slice(0, RECRUIT_OFFER_COUNT);
}

function createOffers(characters: CharacterDefinition[]): RecruitShopOffer[] {
  return Array.from({ length: RECRUIT_OFFER_COUNT }, (_, slotIndex) => ({
    slotIndex,
    character: characters[slotIndex] ?? null,
    price: RECRUIT_OFFER_PRICE,
  }));
}

function getNextOffset(currentOffset: number, poolSize: number): number {
  if (poolSize <= RECRUIT_OFFER_COUNT) return 0;
  return (currentOffset + RECRUIT_OFFER_COUNT) % poolSize;
}

export function createRecruitShopState(roster: CharacterDefinition[]): RecruitShopState {
  const pool = getAvailableRecruitPool(roster);
  const offers = rotateOffers(pool, 0);

  return {
    offers: createOffers(offers),
    refreshCost: RECRUIT_REFRESH_COST,
    nextRotationOffset: getNextOffset(0, pool.length),
  };
}

export function refreshRecruitShopState(
  currentState: RecruitShopState,
  roster: CharacterDefinition[],
): RecruitShopState {
  const pool = getAvailableRecruitPool(roster);
  const offers = rotateOffers(pool, currentState.nextRotationOffset);

  return {
    offers: createOffers(offers),
    refreshCost: currentState.refreshCost,
    nextRotationOffset: getNextOffset(currentState.nextRotationOffset, pool.length),
  };
}

export function shouldAutoRefreshRecruitShop(stagesCleared: number): boolean {
  return stagesCleared >= 1;
}

export function purchaseRecruitOffer(
  currentState: RecruitShopState,
  roster: CharacterDefinition[],
  gold: number,
  maxCharacterSlots: number,
  slotIndex: number,
): RecruitPurchaseResult {
  const offer = currentState.offers[slotIndex];
  if (!offer?.character) {
    return { ok: false, reason: 'empty-slot', updatedShopState: currentState, updatedGold: gold };
  }
  if (gold < offer.price) {
    return { ok: false, reason: 'not-enough-gold', updatedShopState: currentState, updatedGold: gold };
  }
  if (roster.length >= maxCharacterSlots) {
    return { ok: false, reason: 'roster-full', updatedShopState: currentState, updatedGold: gold };
  }

  return {
    ok: true,
    updatedGold: gold - offer.price,
    recruitedCharacter: offer.character,
    updatedShopState: {
      ...currentState,
      offers: currentState.offers.map((currentOffer) =>
        currentOffer.slotIndex === slotIndex ? { ...currentOffer, character: null } : currentOffer,
      ),
    },
  };
}

export function getRecruitPurchaseFailureMessage(reason: RecruitPurchaseFailureReason): string {
  switch (reason) {
    case 'not-enough-gold':
      return '골드가 부족합니다.';
    case 'roster-full':
      return '로스터가 가득 찼습니다.';
    case 'empty-slot':
      return '이미 영입한 슬롯입니다.';
  }
}
