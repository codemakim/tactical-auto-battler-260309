import Phaser from 'phaser';
import type { FormationVisualState } from '../systems/FormationSceneStyles';

export function drawRoundedFrame(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  state: FormationVisualState,
): void {
  graphics.clear();
  graphics.fillStyle(state.backgroundColor, state.alpha ?? 1);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(state.borderWidth, state.borderColor);
  graphics.strokeRoundedRect(x, y, width, height, radius);
}

export function drawHorizontalDivider(
  graphics: Phaser.GameObjects.Graphics,
  x1: number,
  y: number,
  x2: number,
  color: number,
  alpha: number,
): void {
  graphics.lineStyle(1, color, alpha);
  graphics.lineBetween(x1, y, x2, y);
}
