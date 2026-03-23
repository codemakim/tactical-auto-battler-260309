/**
 * 모달 (팝업) 컴포넌트
 * 딤 배경 + 중앙 패널 + 제목 + 내용 + 닫기 버튼
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from './UITheme';
import { UIPanel } from './UIPanel';
import { UIButton } from './UIButton';

export interface UIModalConfig {
  title: string;
  content: string;
  width?: number;
  height?: number;
  buttonLabel?: string;
  onClose?: () => void;
}

export class UIModal {
  private dim: Phaser.GameObjects.Rectangle;
  private panel: UIPanel;
  private closeBtn: UIButton;
  private contentText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, config: UIModalConfig) {
    const w = config.width ?? 400;
    const h = config.height ?? 240;
    const panelX = (GAME_WIDTH - w) / 2;
    const panelY = (GAME_HEIGHT - h) / 2;

    // 딤 배경 (전체 화면 어둡게)
    this.dim = scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6)
      .setInteractive() // 뒤쪽 클릭 방지
      .setDepth(100);

    // 패널
    this.panel = new UIPanel(scene, {
      x: panelX,
      y: panelY,
      width: w,
      height: h,
      title: config.title,
      borderColor: UITheme.colors.borderLight,
    });
    this.panel.setDepth(101);

    // 내용 텍스트
    this.contentText = scene.add.text(UITheme.panel.padding, this.panel.contentY + UITheme.spacing.sm, config.content, {
      ...UITheme.font.body,
      wordWrap: { width: w - UITheme.panel.padding * 2 },
    });
    this.panel.add(this.contentText);

    // 닫기 버튼
    this.closeBtn = new UIButton(scene, {
      x: (w - 140) / 2,
      y: h - 60,
      width: 140,
      height: 40,
      label: config.buttonLabel ?? '확인',
      style: 'primary',
      onClick: () => {
        this.destroy();
        config.onClose?.();
      },
    });
    this.panel.add(this.closeBtn.container);
  }

  destroy(): void {
    this.dim.destroy();
    this.closeBtn.destroy();
    this.panel.destroy();
  }
}
