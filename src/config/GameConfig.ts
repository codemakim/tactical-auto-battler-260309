import Phaser from 'phaser';

// 기본 해상도 (16:9 비율)
export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 640,
      height: 360,
    },
    max: {
      width: 1920,
      height: 1080,
    },
  },
  scene: [], // scenes will be added in main.ts
};
