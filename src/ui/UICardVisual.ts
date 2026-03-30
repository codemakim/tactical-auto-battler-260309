/**
 * 카드 비주얼 컴포넌트
 *
 * RewardScene, FormationScene 등에서 공용으로 사용.
 * 카드 정보를 조건 / 효과 / 대상 3요소로 분리 표시.
 */
import Phaser from 'phaser';
import { UITheme } from './UITheme';
import { Rarity } from '../types';
import type { Action, ActionCondition } from '../types';
import { buildActionCardBadgeModel, type ActionBadge, type ActionBadgeTone } from '../utils/actionCardBadges';

// 레어리티별 테두리 색상
const RARITY_BORDER: Record<string, number> = {
  [Rarity.COMMON]: 0x888899,
  [Rarity.RARE]: 0x4a9eff,
  [Rarity.EPIC]: 0xaa44ff,
  [Rarity.LEGENDARY]: 0xffcc00,
};

const RARITY_TEXT: Record<string, string> = {
  [Rarity.COMMON]: '#888899',
  [Rarity.RARE]: '#4a9eff',
  [Rarity.EPIC]: '#aa44ff',
  [Rarity.LEGENDARY]: '#ffcc00',
};

export interface UICardVisualConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  action: Action;
  condition?: ActionCondition;
  rarity?: string;
  classRestriction?: string;
  interactive?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export class UICardVisual {
  readonly container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private config: Required<Pick<UICardVisualConfig, 'width' | 'height'>> & UICardVisualConfig;

  constructor(scene: Phaser.Scene, cfg: UICardVisualConfig) {
    const w = cfg.width ?? 110;
    const h = cfg.height ?? 150;
    this.config = { ...cfg, width: w, height: h };
    const compact = w < 100;

    this.container = scene.add.container(cfg.x, cfg.y);

    // 배경
    this.bg = scene.add.graphics();
    this.drawBg(cfg.selected ?? false);
    this.container.add(this.bg);

    let ty = 5;
    const padX = compact ? 5 : 6;
    const labelSize = compact ? 7 : 8;

    // ── 헤더: 레어리티 + 이름 ──
    const rarityLabel = cfg.rarity ?? '기본';
    const rarityColor = cfg.rarity ? (RARITY_TEXT[cfg.rarity] ?? '#ccccdd') : '#555566';
    this.addText(scene, w / 2, ty, rarityLabel, { fontSize: `${labelSize}px`, color: rarityColor });
    ty += compact ? 10 : 13;

    this.addText(scene, w / 2, ty, cfg.action.name, {
      fontSize: compact ? '10px' : '12px',
      color: UITheme.colors.textPrimary,
    });
    ty += compact ? 13 : 17;

    // 클래스 제한
    const classLabel = cfg.classRestriction ?? '공용';
    this.addText(scene, w / 2, ty, classLabel, {
      fontSize: `${labelSize}px`,
      color: cfg.classRestriction ? UITheme.colors.textAccent : '#667788',
    });
    ty += compact ? 10 : 13;

    // ── 구분선 ──
    const divider = scene.add.graphics();
    divider.lineStyle(1, UITheme.colors.border, 0.4);
    divider.lineBetween(padX, ty, w - padX, ty);
    this.container.add(divider);
    ty += 4;

    const badgeModel = buildActionCardBadgeModel(cfg.condition, cfg.action.effects.slice(0, 3));
    const sectionGap = compact ? 4 : 5;

    if (badgeModel.selfBadges.length > 0) {
      ty = this.renderBadgeSection(scene, '상황', badgeModel.selfBadges, padX, ty, w, labelSize, compact);
      ty += sectionGap;
    }

    if (badgeModel.targetBadges.length > 0) {
      ty = this.renderBadgeSection(scene, '대상', badgeModel.targetBadges, padX, ty, w, labelSize, compact);
      ty += sectionGap;
    }

    this.renderBadgeSection(scene, '효과', badgeModel.effectBadges, padX, ty, w, labelSize, compact);

    // 인터랙션
    if (cfg.interactive) {
      const hitArea = scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
      this.container.add(hitArea);

      if (cfg.onClick) {
        const onClick = cfg.onClick;
        hitArea.on('pointerdown', () => onClick());
      }
    }
  }

  setSelected(selected: boolean): void {
    this.drawBg(selected);
  }

  private addLabel(scene: Phaser.Scene, x: number, y: number, label: string, fontSize: number): void {
    const t = scene.add
      .text(x, y, label, {
        fontFamily: UITheme.font.family,
        fontSize: `${fontSize}px`,
        color: '#556677',
      })
      .setOrigin(0, 0);
    this.container.add(t);
  }

  private renderBadgeSection(
    scene: Phaser.Scene,
    title: string,
    badges: ActionBadge[],
    x: number,
    y: number,
    cardW: number,
    labelSize: number,
    compact: boolean,
  ): number {
    const badgeFontSize = compact ? 7 : 8;
    const badgeHeight = compact ? 14 : 15;
    const gapX = 4;
    const gapY = 4;
    const maxWidth = cardW - x - 6;
    this.addLabel(scene, x, y, title, labelSize);

    let cursorX = x;
    let cursorY = y + labelSize + 4;

    for (const badge of badges) {
      const badgeWidth = Math.min(this.measureBadgeWidth(badge.text, badgeFontSize), maxWidth);
      if (cursorX !== x && cursorX + badgeWidth > x + maxWidth) {
        cursorX = x;
        cursorY += badgeHeight + gapY;
      }

      const { bg, label } = this.createBadge(
        scene,
        cursorX,
        cursorY,
        badgeWidth,
        badgeHeight,
        badge.text,
        badge.tone,
        badgeFontSize,
      );
      this.container.add(bg);
      this.container.add(label);
      cursorX += badgeWidth + gapX;
    }

    return cursorY + badgeHeight;
  }

  private measureBadgeWidth(text: string, fontSize: number): number {
    return Math.max(34, text.length * (fontSize + 1) + 10);
  }

  private createBadge(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    tone: ActionBadgeTone,
    fontSize: number,
  ): { bg: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.Text } {
    const palette = this.getBadgePalette(tone);
    const bg = scene.add.graphics();
    bg.fillStyle(palette.fill, 0.95);
    bg.fillRoundedRect(x, y, width, height, 4);
    bg.lineStyle(1, palette.border, 0.95);
    bg.strokeRoundedRect(x, y, width, height, 4);

    const label = scene.add
      .text(x + width / 2, y + 2, text, {
        fontFamily: UITheme.font.family,
        fontSize: `${fontSize}px`,
        color: palette.text,
      })
      .setOrigin(0.5, 0);

    if (label.width > width - 8) {
      label.setScale((width - 8) / label.width, 1);
    }

    return { bg, label };
  }

  private getBadgePalette(tone: ActionBadgeTone): { fill: number; border: number; text: string } {
    switch (tone) {
      case 'self':
        return { fill: 0x16324d, border: 0x4a9eff, text: '#9ad2ff' };
      case 'ally':
        return { fill: 0x17344a, border: 0x68b8ff, text: '#b6ddff' };
      case 'enemy':
        return { fill: 0x4a1d26, border: 0xff6677, text: '#ffb3be' };
      case 'effect':
        return { fill: 0x2e2948, border: 0xc29bff, text: '#e3d4ff' };
      default:
        return { fill: 0x2a2a36, border: 0x666677, text: '#ccd0dd' };
    }
  }

  private drawBg(selected: boolean): void {
    const { width: w, height: h, rarity } = this.config;
    const borderColor = selected ? 0xffcc00 : rarity ? (RARITY_BORDER[rarity] ?? 0x888899) : 0x555566;
    const borderWidth = selected ? 3 : 2;
    const fillColor = selected ? 0x222244 : 0x1a1a2e;

    this.bg.clear();
    this.bg.fillStyle(fillColor, 0.95);
    this.bg.fillRoundedRect(0, 0, w, h, 6);
    this.bg.lineStyle(borderWidth, borderColor);
    this.bg.strokeRoundedRect(0, 0, w, h, 6);
  }

  private addText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    style: Partial<Phaser.Types.GameObjects.Text.TextStyle>,
  ): void {
    const t = scene.add.text(x, y, text, { fontFamily: UITheme.font.family, ...style }).setOrigin(0.5, 0);
    this.container.add(t);
  }

  destroy(): void {
    this.container.destroy();
  }
}
