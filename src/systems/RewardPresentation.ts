export interface RewardHeaderCopy {
  stageLabel: string;
  title: string;
  subtitle: string;
}

export interface RewardActionLabels {
  confirm: string;
  skip: string;
  proceed: string;
}

export function getRewardHeaderCopy(input: {
  currentStage: number;
  maxStages: number;
  goldEarned: number;
}): RewardHeaderCopy {
  const { currentStage, maxStages, goldEarned } = input;
  return {
    stageLabel: `Stage ${currentStage} / ${maxStages}`,
    title: `+${goldEarned} GOLD`,
    subtitle: currentStage >= maxStages ? 'FINAL CLEAR' : 'TACTICAL SPOILS SECURED',
  };
}

export function getRewardActionLabels(input: { selectedCardName?: string; isLastStage: boolean }): RewardActionLabels {
  return {
    confirm: input.selectedCardName ? `SECURE ${input.selectedCardName}` : 'SECURE REWARD',
    skip: 'PASS',
    proceed: input.isLastStage ? 'CLAIM VICTORY' : 'REFORM SQUAD',
  };
}

export function getRewardEmptyStateCopy(isLastStage: boolean): string {
  return isLastStage
    ? 'No new tactics recovered. Move to final report.'
    : 'No new tactics recovered. Re-form for the next stage.';
}
