export interface PointLike {
  x: number;
  y: number;
}

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function isPointInsideRect(point: PointLike, rect: RectLike): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function shouldCloseModalFromBackdrop(point: PointLike, panelBounds: RectLike): boolean {
  return !isPointInsideRect(point, panelBounds);
}
