import { gameState } from '../core/GameState';
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UIButton } from '../ui/UIButton';
import { UITheme } from '../ui/UITheme';
import {
  getContinueTargetScene,
  getTitleMenuButtons,
  getTitleMenuMessage,
  type TitleMenuAction,
} from '../systems/TitleMenu';
import { UIModal } from '../ui/UIModal';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const saveStatus = gameState.getSaveStatus();
    const menuButtons = getTitleMenuButtons(saveStatus);
    const message = getTitleMenuMessage(saveStatus);

    // 타이틀
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 3, 'Tactical Auto-Battle\nRoguelike', {
        fontSize: '48px',
        color: '#ffffff',
        fontFamily: 'monospace',
        align: 'center',
      })
      .setOrigin(0.5);

    if (message) {
      this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, message, {
          fontSize: '16px',
          color: saveStatus === 'corrupted' ? UITheme.colors.textWarning : UITheme.colors.textSecondary,
          fontFamily: UITheme.font.family,
          align: 'center',
          wordWrap: { width: 460 },
        })
        .setOrigin(0.5);
    }

    const startY = message ? GAME_HEIGHT / 2 + 48 : GAME_HEIGHT / 2 + 60;
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
    if (action === 'delete_save') {
      new UIModal(this, {
        title: '세이브 삭제',
        content: '현재 세이브 데이터를 삭제합니다.\n정말 계속하시겠습니까?\n\n삭제 후에는 되돌릴 수 없습니다.',
        buttonLabel: '삭제',
        secondaryButtonLabel: '취소',
        onClose: () => {
          gameState.deleteSaveData();
          gameState.reset();
          this.scene.restart();
        },
        onSecondaryAction: () => {},
      });
      return;
    }

    if (action === 'start' || action === 'new_game') {
      gameState.reset();
    }

    if (action === 'continue') {
      this.scene.start(getContinueTargetScene(!!gameState.runState));
      return;
    }

    this.scene.start('TownScene');
  }
}
