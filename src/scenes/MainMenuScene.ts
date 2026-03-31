import { gameState } from '../core/GameState';
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UIButton } from '../ui/UIButton';
import { UITheme } from '../ui/UITheme';
import {
  getContinueTargetScene,
  getTitleMenuButtons,
  getTitleMenuMessage,
  getTitleMenuStatusPanel,
  type TitleMenuAction,
  type TitleMenuSavePreview,
} from '../systems/TitleMenu';
import { UIModal } from '../ui/UIModal';
import { loadSaveDataFromStorage } from '../systems/SaveSystem';
import { drawRoundedFrame } from '../ui/FormationGraphics';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MainMenuScene' });
  }

  create(): void {
    const saveStatus = gameState.getSaveStatus();
    const savePreview = this.getSavePreview();
    const menuButtons = getTitleMenuButtons(saveStatus, !!savePreview?.hasActiveRun);
    const message = getTitleMenuMessage(saveStatus, savePreview ?? undefined);
    const statusPanel = getTitleMenuStatusPanel(saveStatus, savePreview ?? undefined);

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
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 24, message, {
          fontSize: '14px',
          color: saveStatus === 'corrupted' ? UITheme.colors.textWarning : UITheme.colors.textAccent,
          fontFamily: UITheme.font.family,
          align: 'center',
          wordWrap: { width: 460 },
        })
        .setOrigin(0.5);
    }

    if (statusPanel) {
      this.renderStatusPanel(statusPanel);
    }

    const startY = statusPanel ? 500 : message ? GAME_HEIGHT / 2 + 48 : GAME_HEIGHT / 2 + 60;
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

  private getSavePreview(): TitleMenuSavePreview | null {
    const saveData = loadSaveDataFromStorage();
    if (!saveData) return null;

    return {
      hasActiveRun: !!saveData.runState,
      currentStage: saveData.runState?.currentStage,
      maxStages: saveData.runState?.maxStages,
      gold: saveData.gold + (saveData.runState?.gold ?? 0),
      rosterSize: saveData.characters.length,
    };
  }

  private renderStatusPanel(panel: { title: string; body: string; footer: string; accentColor: string }): void {
    const x = GAME_WIDTH / 2 - 230;
    const y = 285;
    const width = 460;
    const height = 128;
    const accent = parseInt(panel.accentColor.replace('#', ''), 16);

    const gfx = this.add.graphics();
    drawRoundedFrame(gfx, x, y, width, height, 10, {
      backgroundColor: 0x161b2b,
      borderColor: accent,
      borderWidth: 2,
      alpha: 0.96,
    });
    gfx.fillStyle(accent, 0.18);
    gfx.fillRoundedRect(x + 10, y + 10, width - 20, 24, 6);

    this.add.text(x + 20, y + 14, panel.title, {
      fontSize: '12px',
      color: panel.accentColor,
      fontFamily: UITheme.font.family,
      fontStyle: 'bold',
    });

    this.add.text(x + 20, y + 50, panel.body, {
      fontSize: '22px',
      color: UITheme.colors.textPrimary,
      fontFamily: UITheme.font.family,
      fontStyle: 'bold',
    });

    this.add.text(x + 20, y + 90, panel.footer, {
      fontSize: '13px',
      color: '#8ea3c9',
      fontFamily: UITheme.font.family,
      wordWrap: { width: width - 40 },
    });
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
