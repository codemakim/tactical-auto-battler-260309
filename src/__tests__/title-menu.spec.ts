import { describe, expect, it } from 'vitest';
import {
  getContinueTargetScene,
  getTitleMenuButtons,
  getTitleMenuMessage,
  getTitleMenuStatusPanel,
} from '../systems/TitleMenu';

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
    expect(getTitleMenuButtons('valid', true)[0]).toEqual({
      id: 'continue',
      label: 'RESUME RUN',
      style: 'primary',
    });
  });

  it('손상 세이브는 NEW GAME과 DELETE SAVE만 노출한다', () => {
    expect(getTitleMenuButtons('corrupted')).toEqual([
      { id: 'new_game', label: 'NEW GAME', style: 'primary' },
      { id: 'delete_save', label: 'DELETE SAVE', style: 'secondary' },
    ]);
  });

  it('상태별 안내 문구를 반환한다', () => {
    expect(getTitleMenuMessage('empty')).toBeNull();
    expect(getTitleMenuMessage('valid')).toBe('Archive synchronized');
    expect(
      getTitleMenuMessage('valid', {
        hasActiveRun: true,
        currentStage: 3,
        maxStages: 5,
        gold: 120,
        rosterSize: 4,
      }),
    ).toBe('Operation live · Stage 3 / 5');
    expect(getTitleMenuMessage('corrupted')).toBe('Signal lost');
  });

  it('CONTINUE는 저장된 런이 있으면 RunMapScene으로 복귀한다', () => {
    expect(getContinueTargetScene(false)).toBe('TownScene');
    expect(getContinueTargetScene(true)).toBe('RunMapScene');
  });

  it('게임형 저장 상태 패널 카피를 만든다', () => {
    expect(
      getTitleMenuStatusPanel('valid', {
        hasActiveRun: true,
        currentStage: 4,
        maxStages: 5,
        gold: 88,
        rosterSize: 4,
      }),
    ).toEqual({
      title: 'OPERATION LIVE',
      body: 'Stage 4 / 5  ·  88 GOLD',
      footer: 'Resume returns to the Run Map.',
      accentColor: '#ffcc66',
    });

    expect(
      getTitleMenuStatusPanel('valid', {
        hasActiveRun: false,
        gold: 500,
        rosterSize: 4,
      }),
    ).toEqual({
      title: 'ARCHIVE READY',
      body: '500 GOLD  ·  Roster 4',
      footer: 'Continue returns to Town.',
      accentColor: '#4a9eff',
    });
  });
});
