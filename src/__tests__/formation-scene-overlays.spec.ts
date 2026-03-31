import { describe, expect, it } from 'vitest';
import { FORMATION_LAYOUT } from '../systems/FormationSceneLayout';

describe('FormationScene overlay layout', () => {
  it('커맨드, 프리셋, 카드 편집 오버레이 크기를 고정한다', () => {
    expect(FORMATION_LAYOUT.overlays.command).toMatchObject({
      width: 640,
      height: 280,
      cardWidth: 182,
      cardGap: 18,
    });
    expect(FORMATION_LAYOUT.overlays.preset).toMatchObject({
      width: 560,
      height: 240,
      slotButtonWidth: 150,
    });
    expect(FORMATION_LAYOUT.overlays.cardEditor).toMatchObject({
      width: 1080,
      height: 670,
      cardWidth: 188,
      cardHeight: 246,
      cardGap: 26,
    });
  });
});
