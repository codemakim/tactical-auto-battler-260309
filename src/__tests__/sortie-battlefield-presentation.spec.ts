import { describe, expect, it } from 'vitest';
import { BATTLEFIELDS } from '../data/Battlefields';
import { createInitialBattlefieldProgress } from '../systems/BattlefieldProgression';
import { createSortieBattlefieldViewModel } from '../systems/SortieBattlefieldPresentation';

describe('SortieBattlefieldPresentation', () => {
  it('해금된 전장은 출격 상태와 스테이지 라벨을 노출한다', () => {
    const plains = BATTLEFIELDS.find((battlefield) => battlefield.id === 'plains')!;
    const progress = createInitialBattlefieldProgress();

    const viewModel = createSortieBattlefieldViewModel(plains, progress);

    expect(viewModel.locked).toBe(false);
    expect(viewModel.statusText).toBe('출격 가능');
    expect(viewModel.maxStagesLabel).toBe('5 스테이지 런');
    expect(viewModel.recordText).toBe('첫 클리어 도전');
  });

  it('잠긴 전장은 해금 문구를 그대로 전달한다', () => {
    const darkForest = BATTLEFIELDS.find((battlefield) => battlefield.id === 'dark_forest')!;
    const progress = createInitialBattlefieldProgress();

    const viewModel = createSortieBattlefieldViewModel(darkForest, progress);

    expect(viewModel.locked).toBe(true);
    expect(viewModel.unlockText).toBe('변방 초원 클리어');
    expect(viewModel.statusText).toBe('잠김');
  });
});
