import Phaser from 'phaser';
import { gameState } from '../core/GameState';
import { BASIC_UNIT_FRAMES } from '../data/BasicUnitSheet';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 로딩 바 표시
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222244, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4a9eff, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // 배경 이미지
    this.load.image('town-bg', 'src/assets/backgrounds/town-bg.png');
    this.load.image('battle-bg-plains', 'src/assets/backgrounds/plains-battle-bg.png');
    this.load.spritesheet('units-basic-sheet', 'src/assets/sprites/spritesheet_3x2_transparent_archer_fixed.png', {
      frameWidth: 400,
      frameHeight: 400,
    });
  }

  create(): void {
    gameState.loadFromStorage();

    const basicSheet = this.textures.get('units-basic-sheet');
    for (const frameDef of Object.values(BASIC_UNIT_FRAMES)) {
      if (!basicSheet.has(frameDef.frame)) {
        basicSheet.add(frameDef.frame, 0, frameDef.x, frameDef.y, frameDef.width, frameDef.height);
      }
    }

    this.scene.start('MainMenuScene');
  }
}
