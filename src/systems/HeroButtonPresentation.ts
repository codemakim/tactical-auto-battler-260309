import { HeroButtonState } from '../types';

export interface HeroButtonPresentationInput {
  state: HeroButtonState;
  interventionsRemaining: number;
  queuedAbilityName?: string;
}

export interface HeroButtonPresentation {
  label: string;
  style: 'primary' | 'secondary';
  disabled: boolean;
  pulsing: boolean;
  queuedBorderColor?: number;
}

export function getHeroButtonPresentation(input: HeroButtonPresentationInput): HeroButtonPresentation {
  switch (input.state) {
    case HeroButtonState.READY:
      return {
        label: `영웅 개입 (${input.interventionsRemaining})`,
        style: 'primary',
        disabled: false,
        pulsing: false,
      };
    case HeroButtonState.QUEUED:
      return {
        label: `${input.queuedAbilityName ?? '능력'} 대기중`,
        style: 'primary',
        disabled: false,
        pulsing: true,
        queuedBorderColor: 0xffcc00,
      };
    case HeroButtonState.USED:
      return {
        label: '개입 완료',
        style: 'primary',
        disabled: true,
        pulsing: false,
      };
    case HeroButtonState.TARGETING:
      return {
        label: '취소',
        style: 'secondary',
        disabled: false,
        pulsing: false,
      };
    case HeroButtonState.DISABLED:
      return {
        label: '영웅 개입',
        style: 'primary',
        disabled: true,
        pulsing: false,
      };
  }
}
