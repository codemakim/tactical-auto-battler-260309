export interface BasicUnitFrame {
  texture: string;
  frame: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// 3x2 합본 기본 유닛 시트에서 각 클래스의 실제 표시 영역만 잘라 쓴다.
const SHEET_TEXTURE = 'units-basic-sheet';
const CELL_W = 400;
const CELL_H = 400;

function frame(
  cellX: number,
  cellY: number,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): BasicUnitFrame {
  return {
    texture: SHEET_TEXTURE,
    frame: name,
    x: cellX * CELL_W + x,
    y: cellY * CELL_H + y,
    width,
    height,
  };
}

export const BASIC_UNIT_FRAMES: Record<string, BasicUnitFrame> = {
  GUARDIAN: frame(0, 0, 'basic-guardian', 80, 40, 240, 287),
  WARRIOR: frame(1, 0, 'basic-warrior', 91, 40, 219, 287),
  ARCHER: frame(2, 0, 'basic-archer', 89, 0, 247, 327),
  ASSASSIN: frame(0, 1, 'basic-assassin', 56, 27, 288, 300),
  LANCER: frame(1, 1, 'basic-lancer', 34, 27, 332, 300),
  CONTROLLER: frame(2, 1, 'basic-controller', 58, 27, 284, 300),
};
