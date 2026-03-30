import { gameState } from '../core/GameState';
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const hasSave = gameState.hasSaveData();

    // 타이틀
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'Tactical Auto-Battle\nRoguelike', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
      })
      .setOrigin(0.5);

    // 시작 / 이어하기 버튼
    const startBtn = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 60, hasSave ? '[ CONTINUE ]' : '[ START ]', {
        fontSize: '28px',
        color: '#4a9eff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#7fbfff'));
    startBtn.on('pointerout', () => startBtn.setColor('#4a9eff'));
    startBtn.on('pointerdown', () => {
      if (!hasSave) {
        gameState.reset();
      }
      this.scene.start('TownScene');
    });

    // 버전
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'v0.1.0 - Prototype', {
        fontSize: '14px',
        color: '#666688',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);
  }
}
