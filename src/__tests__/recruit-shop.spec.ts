import { describe, expect, it } from 'vitest';
import { createCharacterDef } from '../entities/UnitFactory';
import {
  createRecruitShopState,
  purchaseRecruitOffer,
  refreshRecruitShopState,
  shouldAutoRefreshRecruitShop,
} from '../systems/RecruitShop';
import { CharacterClass } from '../types';

function createRoster() {
  return [
    createCharacterDef('Aldric', CharacterClass.WARRIOR),
    createCharacterDef('Lyra', CharacterClass.ARCHER),
    createCharacterDef('Theron', CharacterClass.GUARDIAN),
    createCharacterDef('Zara', CharacterClass.CONTROLLER),
  ];
}

describe('RecruitShop', () => {
  it('초기 상점 후보는 로스터에 없는 신규 멤버 3명으로 생성된다', () => {
    const roster = createRoster();

    const shop = createRecruitShopState(roster);

    expect(shop.offers).toHaveLength(3);
    expect(shop.refreshCost).toBe(20);

    const offerIds = shop.offers.map((offer) => offer.character?.id);
    expect(new Set(offerIds).size).toBe(3);
    expect(offerIds.every((id) => !roster.some((character) => character.id === id))).toBe(true);
    expect(shop.offers.every((offer) => offer.price === 80)).toBe(true);
  });

  it('리프레시는 전체 3슬롯을 새 후보로 교체한다', () => {
    const roster = createRoster();
    const initial = createRecruitShopState(roster);

    const refreshed = refreshRecruitShopState(initial, roster);

    expect(refreshed.offers).toHaveLength(3);
    expect(refreshed.offers.map((offer) => offer.character?.id)).not.toEqual(
      initial.offers.map((offer) => offer.character?.id),
    );
  });

  it('같은 후보가 다시 나와도 리프레시마다 스탯이나 행동 카드 조합이 재롤된다', () => {
    const roster = createRoster();
    const initial = createRecruitShopState(roster);
    const rotated = refreshRecruitShopState(initial, roster);
    const cycled = refreshRecruitShopState(rotated, roster);
    const cycledAgain = refreshRecruitShopState(cycled, roster);
    const wrapped = refreshRecruitShopState(cycledAgain, roster);
    const initialBrakka = initial.offers[0].character;
    const wrappedBrakka = wrapped.offers[0].character;

    expect(initialBrakka?.name).toBe('Brakka');
    expect(wrappedBrakka?.name).toBe('Brakka');
    expect(initialBrakka?.characterClass).toBe(wrappedBrakka?.characterClass);
    expect(initialBrakka?.baseStats).not.toEqual(wrappedBrakka?.baseStats);
  });

  it('영입 성공 시 골드를 차감하고 캐릭터를 반환하며 슬롯을 빈 슬롯으로 만든다', () => {
    const roster = createRoster();
    const shop = createRecruitShopState(roster);

    const result = purchaseRecruitOffer(shop, roster, 200, 8, 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updatedGold).toBe(120);
    expect(result.recruitedCharacter).toEqual(shop.offers[1].character);
    expect(result.updatedShopState.offers[1].character).toBeNull();
  });

  it('골드가 부족하면 영입할 수 없다', () => {
    const roster = createRoster();
    const shop = createRecruitShopState(roster);

    const result = purchaseRecruitOffer(shop, roster, 10, 8, 0);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-enough-gold');
    expect(result.updatedGold).toBe(10);
  });

  it('로스터가 가득 차면 영입할 수 없다', () => {
    const roster = createRoster();
    const shop = createRecruitShopState(roster);

    const result = purchaseRecruitOffer(shop, roster, 200, roster.length, 0);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('roster-full');
  });

  it('자동 갱신은 1스테이지 이상 클리어한 런 종료일 때만 발생한다', () => {
    expect(shouldAutoRefreshRecruitShop(0)).toBe(false);
    expect(shouldAutoRefreshRecruitShop(1)).toBe(true);
    expect(shouldAutoRefreshRecruitShop(5)).toBe(true);
  });
});
