import { describe, expect, it } from 'vitest';
import { getRewardActionLabels, getRewardEmptyStateCopy, getRewardHeaderCopy } from '../systems/RewardPresentation';

describe('RewardPresentation', () => {
  it('보상 브리핑 헤더 카피를 만든다', () => {
    expect(getRewardHeaderCopy({ currentStage: 3, maxStages: 5, goldEarned: 42 })).toEqual({
      stageLabel: 'Stage 3 / 5',
      title: '+42 GOLD',
      subtitle: 'TACTICAL SPOILS SECURED',
    });
  });

  it('버튼 라벨은 선택 카드와 마지막 스테이지 여부를 반영한다', () => {
    expect(getRewardActionLabels({ selectedCardName: 'Fortify', isLastStage: false })).toEqual({
      confirm: 'SECURE Fortify',
      skip: 'PASS',
      proceed: 'REFORM SQUAD',
    });

    expect(getRewardActionLabels({ isLastStage: true })).toEqual({
      confirm: 'SECURE REWARD',
      skip: 'PASS',
      proceed: 'CLAIM VICTORY',
    });
  });

  it('빈 보상 카피는 마지막 스테이지 여부에 따라 바뀐다', () => {
    expect(getRewardEmptyStateCopy(false)).toBe('No new tactics recovered. Re-form for the next stage.');
    expect(getRewardEmptyStateCopy(true)).toBe('No new tactics recovered. Move to final report.');
  });
});
