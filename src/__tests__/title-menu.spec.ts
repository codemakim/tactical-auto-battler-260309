import { describe, expect, it } from 'vitest';
import { getTitleMenuButtons } from '../systems/TitleMenu';

describe('TitleMenu', () => {
  it('세이브가 없으면 START 버튼만 노출한다', () => {
    expect(getTitleMenuButtons(false)).toEqual([{ id: 'start', label: 'START', style: 'primary' }]);
  });

  it('세이브가 있으면 CONTINUE와 NEW GAME을 순서대로 노출한다', () => {
    expect(getTitleMenuButtons(true)).toEqual([
      { id: 'continue', label: 'CONTINUE', style: 'primary' },
      { id: 'new_game', label: 'NEW GAME', style: 'secondary' },
    ]);
  });
});
