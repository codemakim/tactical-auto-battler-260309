import { gameState } from '../core/GameState';
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UIButton } from '../ui/UIButton';
import { UITheme } from '../ui/UITheme';
import { getTitleMenuButtons, type TitleMenuAction } from '../systems/TitleMenu';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const hasSave = gameState.hasSaveData();
    const menuButtons = getTitleMenuButtons(hasSave);

    // 타이틀
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'Tactical Auto-Battle\nRoguelike', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
      })
      .setOrigin(0.5);

    if (hasSave) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Saved progress detected', {
          fontSize: '16px',
          color: UITheme.colors.textSecondary,
          fontFamily: UITheme.font.family,
        })
        .setOrigin(0.5);
    }

    const startY = hasSave ? GAME_HEIGHT / 2 + 36 : GAME_HEIGHT / 2 + 60;
    menuButtons.forEach((button, index) => {
      new UIButton(this, {
        x: GAME_WIDTH / 2 - 110,
        y: startY + index * 60,
        width: 220,
        height: 46,
        label: button.label,
        style: button.style,
        onClick: () => this.onMenuAction(button.id),
      });
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

  private onMenuAction(action: TitleMenuAction): void {
    if (action === 'start' || action === 'new_game') {
      gameState.reset();
    }

    this.scene.start('TownScene');
  }
}
