import { describe, expect, it } from 'vitest';
import { getContinueTargetScene, getTitleMenuButtons, getTitleMenuMessage } from '../systems/TitleMenu';

describe('TitleMenu', () => {
  it('세이브가 없으면 START 버튼만 노출한다', () => {
    expect(getTitleMenuButtons('empty')).toEqual([{ id: 'start', label: 'START', style: 'primary' }]);
  });

  it('정상 세이브가 있으면 CONTINUE, NEW GAME, DELETE SAVE를 노출한다', () => {
    expect(getTitleMenuButtons('valid')).toEqual([
      { id: 'continue', label: 'CONTINUE', style: 'primary' },
      { id: 'new_game', label: 'NEW GAME', style: 'secondary' },
      { id: 'delete_save', label: 'DELETE SAVE', style: 'secondary' },
    ]);
  });

  it('손상 세이브는 NEW GAME과 DELETE SAVE만 노출한다', () => {
    expect(getTitleMenuButtons('corrupted')).toEqual([
      { id: 'new_game', label: 'NEW GAME', style: 'primary' },
      { id: 'delete_save', label: 'DELETE SAVE', style: 'secondary' },
    ]);
  });

  it('상태별 안내 문구를 반환한다', () => {
    expect(getTitleMenuMessage('empty')).toBeNull();
    expect(getTitleMenuMessage('valid')).toBe('Saved progress detected');
    expect(getTitleMenuMessage('corrupted')).toBe('Save data is corrupted. Start fresh or delete it.');
  });

  it('CONTINUE는 저장된 런이 있으면 RunMapScene으로 복귀한다', () => {
    expect(getContinueTargetScene(false)).toBe('TownScene');
    expect(getContinueTargetScene(true)).toBe('RunMapScene');
  });
});
