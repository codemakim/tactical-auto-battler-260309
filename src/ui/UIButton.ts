/**
 * 버튼 컴포넌트
 * Primary / Secondary 스타일, hover 효과, 비활성화 지원
 */
import Phaser from 'phaser';
import { UITheme } from './UITheme';

export interface UIButtonConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  label: string;
  style?: 'primary' | 'secondary';
  onClick: () => void;
  disabled?: boolean;
}

interface UIButtonPaletteOverride {
  border?: number;
  text?: string;
}

export class UIButton {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Rectangle;
  private disabled: boolean;
  private style: 'primary' | 'secondary';
  private width: number;
  private height: number;
  private paletteOverride?: UIButtonPaletteOverride;

  constructor(scene: Phaser.Scene, config: UIButtonConfig) {
    this.style = config.style ?? 'primary';
    this.disabled = config.disabled ?? false;
    this.width = config.width ?? 180;
    this.height = config.height ?? 44;

    this.container = scene.add.container(config.x, config.y);

    // 배경
    this.bg = scene.add.graphics();
    this.drawBg(false);
    this.container.add(this.bg);

    // 텍스트
    this.text = scene.add
      .text(this.width / 2, this.height / 2, config.label, {
        fontSize: '16px',
        color: this.disabled ? UITheme.colors.textDisabled : UITheme.colors.textPrimary,
        fontFamily: UITheme.font.family,
      })
      .setOrigin(0.5);
    this.container.add(this.text);

    // 클릭 영역 (투명 사각형)
    this.hitArea = scene.add
      .rectangle(this.width / 2, this.height / 2, this.width, this.height, 0x000000, 0)
      .setInteractive({ useHandCursor: !this.disabled });
    this.container.add(this.hitArea);

    // 이벤트
    this.hitArea.on('pointerover', () => {
      if (!this.disabled) this.drawBg(true);
    });
    this.hitArea.on('pointerout', () => {
      this.drawBg(false);
    });
    this.hitArea.on('pointerdown', () => {
      if (!this.disabled) config.onClick();
    });
  }

  private drawBg(hovered: boolean): void {
    this.bg.clear();

    let color: number;
    if (this.disabled) {
      color = UITheme.colors.btnDisabled;
    } else if (this.style === 'primary') {
      color = hovered ? UITheme.colors.btnPrimaryHover : UITheme.colors.btnPrimary;
    } else {
      color = hovered ? UITheme.colors.btnSecondaryHover : UITheme.colors.btnSecondary;
    }

    this.bg.fillStyle(color, 1);
    this.bg.fillRoundedRect(0, 0, this.width, this.height, 4);
    const borderColor =
      this.paletteOverride?.border ??
      (hovered && !this.disabled ? UITheme.colors.borderHighlight : UITheme.colors.border);
    this.bg.lineStyle(1, borderColor);
    this.bg.strokeRoundedRect(0, 0, this.width, this.height, 4);
  }

  setDisabled(disabled: boolean): this {
    this.disabled = disabled;
    this.hitArea.setInteractive({ useHandCursor: !disabled });
    this.text.setColor(
      disabled ? UITheme.colors.textDisabled : (this.paletteOverride?.text ?? UITheme.colors.textPrimary),
    );
    this.drawBg(false);
    return this;
  }

  setLabel(label: string): this {
    this.text.setText(label);
    return this;
  }

  setStyle(style: 'primary' | 'secondary'): this {
    this.style = style;
    this.drawBg(false);
    return this;
  }

  setPaletteOverride(paletteOverride?: UIButtonPaletteOverride): this {
    this.paletteOverride = paletteOverride;
    this.text.setColor(
      this.disabled ? UITheme.colors.textDisabled : (this.paletteOverride?.text ?? UITheme.colors.textPrimary),
    );
    this.drawBg(false);
    return this;
  }

  setVisible(visible: boolean): this {
    this.container.setVisible(visible);
    return this;
  }

  destroy(): void {
    this.container.destroy();
  }
}
