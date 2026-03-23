/**
 * 기본 패널 컴포넌트
 * 배경 + 테두리를 가진 재사용 가능한 컨테이너
 */
import Phaser from 'phaser';
import { UITheme } from './UITheme';

export interface UIPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  title?: string;
  bgColor?: number;
  borderColor?: number;
  bgAlpha?: number;
}

export class UIPanel {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private titleText?: Phaser.GameObjects.Text;
  private config: Required<Pick<UIPanelConfig, 'x' | 'y' | 'width' | 'height'>> & UIPanelConfig;

  constructor(scene: Phaser.Scene, config: UIPanelConfig) {
    this.config = {
      bgColor: UITheme.colors.bgPanel,
      borderColor: UITheme.colors.border,
      bgAlpha: 0.95,
      ...config,
    };

    this.container = scene.add.container(config.x, config.y);

    // 배경 + 테두리
    this.bg = scene.add.graphics();
    this.drawBackground();
    this.container.add(this.bg);

    // 타이틀
    if (config.title) {
      this.titleText = scene.add.text(UITheme.panel.padding, UITheme.panel.padding, config.title, UITheme.font.heading);
      this.container.add(this.titleText);
    }
  }

  private drawBackground(): void {
    const { width, height, bgColor, borderColor, bgAlpha } = this.config;
    this.bg.clear();
    this.bg.fillStyle(bgColor!, bgAlpha);
    this.bg.fillRoundedRect(0, 0, width, height, UITheme.panel.cornerRadius);
    this.bg.lineStyle(UITheme.panel.borderWidth, borderColor!);
    this.bg.strokeRoundedRect(0, 0, width, height, UITheme.panel.cornerRadius);
  }

  /** 패널 내부에 Phaser 오브젝트 추가 (좌표는 패널 로컬) */
  add(child: Phaser.GameObjects.GameObject): this {
    this.container.add(child);
    return this;
  }

  /** 컨텐츠 시작 Y (타이틀 아래) */
  get contentY(): number {
    return this.titleText ? UITheme.panel.padding + 30 + UITheme.spacing.sm : UITheme.panel.padding;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  setDepth(depth: number): this {
    this.container.setDepth(depth);
    return this;
  }

  destroy(): void {
    this.container.destroy();
  }
}
