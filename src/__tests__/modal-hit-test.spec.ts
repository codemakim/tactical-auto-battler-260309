import { describe, expect, it } from 'vitest';
import { shouldCloseModalFromBackdrop } from '../ui/ModalHitTest';

describe('ModalHitTest', () => {
  const panel = { x: 190, y: 100, width: 900, height: 520 };

  it('패널 내부 빈 공간 클릭은 닫기 요청으로 처리하지 않는다', () => {
    expect(shouldCloseModalFromBackdrop({ x: 640, y: 360 }, panel)).toBe(false);
  });

  it('패널 밖 딤 영역 클릭만 닫기 요청으로 처리한다', () => {
    expect(shouldCloseModalFromBackdrop({ x: 120, y: 360 }, panel)).toBe(true);
    expect(shouldCloseModalFromBackdrop({ x: 640, y: 80 }, panel)).toBe(true);
  });

  it('패널 테두리 위 클릭은 내부 클릭으로 취급한다', () => {
    expect(shouldCloseModalFromBackdrop({ x: panel.x, y: panel.y }, panel)).toBe(false);
    expect(shouldCloseModalFromBackdrop({ x: panel.x + panel.width, y: panel.y + panel.height }, panel)).toBe(false);
  });
});
