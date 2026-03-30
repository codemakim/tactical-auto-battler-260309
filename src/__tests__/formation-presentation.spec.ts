import { describe, expect, it } from 'vitest';
import { getFormationLanePresentation, getFormationPanelLabels } from '../systems/FormationPresentation';

describe('FormationPresentation', () => {
  it('패널 라벨은 짧고 게임 UI 톤을 유지한다', () => {
    const labels = getFormationPanelLabels();

    expect(labels.roster).toBe('ROSTER');
    expect(labels.command).toBe('COMMAND');
    expect(labels.unit).toBe('UNIT');
    expect(labels.presets).toBe('PRESETS');
    expect(labels.cards).toBe('TACTICS');
    expect(labels.deploy).toBe('DEPLOY');
    expect(Object.values(labels).every((label) => !label.includes('('))).toBe(true);
  });

  it('라인 프레젠테이션은 괄호 없는 전술 용어를 사용한다', () => {
    const back = getFormationLanePresentation('BACK');
    const front = getFormationLanePresentation('FRONT');

    expect(back.title).toBe('BACKLINE');
    expect(back.caption).toBe('RANGED / CONTROL');
    expect(front.title).toBe('FRONTLINE');
    expect(front.caption).toBe('VANGUARD / TANK');
  });
});
