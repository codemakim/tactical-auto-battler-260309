import { describe, expect, it } from 'vitest';
import { formatTownHeaderHeroInfo } from '../systems/TownHeader';
import { HeroType } from '../types';

describe('formatTownHeaderHeroInfo', () => {
  it('COMMANDER 정보를 타운 상단용 문자열로 반환한다', () => {
    expect(formatTownHeaderHeroInfo(HeroType.COMMANDER)).toEqual({
      title: 'Hero: Commander',
      subtitle: '지휘 특화 — 아군 버프 중심',
    });
  });

  it('MAGE 정보를 타운 상단용 문자열로 반환한다', () => {
    expect(formatTownHeaderHeroInfo(HeroType.MAGE)).toEqual({
      title: 'Hero: Mage',
      subtitle: '직접 타격 특화 — 적 데미지/디버프 중심',
    });
  });

  it('SUPPORT 정보를 타운 상단용 문자열로 반환한다', () => {
    expect(formatTownHeaderHeroInfo(HeroType.SUPPORT)).toEqual({
      title: 'Hero: Support',
      subtitle: '회복/지원 특화 — 힐/버프 중심',
    });
  });
});
