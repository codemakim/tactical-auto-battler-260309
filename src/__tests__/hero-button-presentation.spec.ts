import { describe, expect, it } from 'vitest';
import { HeroButtonState } from '../types';
import { getHeroButtonPresentation } from '../systems/HeroButtonPresentation';

describe('getHeroButtonPresentation', () => {
  it('READY는 남은 횟수를 포함한 primary 버튼으로 렌더링한다', () => {
    expect(
      getHeroButtonPresentation({
        state: HeroButtonState.READY,
        interventionsRemaining: 2,
      }),
    ).toEqual({
      label: '영웅 개입 (2)',
      style: 'primary',
      disabled: false,
      pulsing: false,
    });
  });

  it('QUEUED는 능력명, gold border, pulse를 사용한다', () => {
    expect(
      getHeroButtonPresentation({
        state: HeroButtonState.QUEUED,
        interventionsRemaining: 1,
        queuedAbilityName: 'Rally',
      }),
    ).toEqual({
      label: 'Rally 대기중',
      style: 'primary',
      disabled: false,
      pulsing: true,
      queuedBorderColor: 0xffcc00,
    });
  });

  it('USED는 비활성 완료 상태로 렌더링한다', () => {
    expect(
      getHeroButtonPresentation({
        state: HeroButtonState.USED,
        interventionsRemaining: 0,
      }),
    ).toEqual({
      label: '개입 완료',
      style: 'primary',
      disabled: true,
      pulsing: false,
    });
  });

  it('TARGETING은 secondary 취소 버튼으로 렌더링한다', () => {
    expect(
      getHeroButtonPresentation({
        state: HeroButtonState.TARGETING,
        interventionsRemaining: 1,
      }),
    ).toEqual({
      label: '취소',
      style: 'secondary',
      disabled: false,
      pulsing: false,
    });
  });

  it('DISABLED는 기본 라벨의 비활성 버튼으로 렌더링한다', () => {
    expect(
      getHeroButtonPresentation({
        state: HeroButtonState.DISABLED,
        interventionsRemaining: 1,
      }),
    ).toEqual({
      label: '영웅 개입',
      style: 'primary',
      disabled: true,
      pulsing: false,
    });
  });
});
