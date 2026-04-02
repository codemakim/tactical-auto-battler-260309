import Phaser from 'phaser';
import { UITheme } from './UITheme';
import { calculateMiniCardBadgeLayout } from './ActionMiniCardLayout';
import { buildActionCardBadgeModel, type ActionBadgeTone } from '../utils/actionCardBadges';
import { getStructuredCondition, getStructuredEffect } from '../utils/actionText';
import type { Action, ActionCondition } from '../types';

export interface UIActionMiniCardConfig {
  x: number;
  y: number;
  width?: number;
  height?: number;
  action: Action;
  condition: ActionCondition;
  rarity?: string;
  classRestriction?: string;
  showTooltip?: boolean;
  density?: 'default' | 'compact';
  autoHeight?: boolean;
}

interface BadgePalette {
  fill: number;
  border: number;
  text: string;
}

const DEFAULT_WIDTH = 170;
const DEFAULT_HEIGHT = 70;
const MINI_BG = 0x1a1a2e;
const MINI_BORDER = 0x334466;
const CONDITION_PALETTE: BadgePalette = { fill: 0x1a3a2a, border: 0x44cc88, text: '#88ddaa' };

export class UIActionMiniCard {
  readonly container: Phaser.GameObjects.Container;
  readonly height: number;

  private readonly scene: Phaser.Scene;
  private readonly config: Required<Pick<UIActionMiniCardConfig, 'width' | 'height' | 'showTooltip' | 'autoHeight'>> &
    UIActionMiniCardConfig;
  private tooltip: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, cfg: UIActionMiniCardConfig) {
    this.scene = scene;
    this.config = {
      ...cfg,
      rarity: cfg.rarity ?? cfg.action.rarity,
      classRestriction: cfg.classRestriction ?? cfg.action.classRestriction,
      width: cfg.width ?? DEFAULT_WIDTH,
      height: cfg.height ?? DEFAULT_HEIGHT,
      showTooltip: cfg.showTooltip ?? true,
      autoHeight: cfg.autoHeight ?? false,
      density: cfg.density ?? 'default',
    };

    this.container = scene.add.container(cfg.x, cfg.y);
    this.height = this.draw();
  }

  destroy(): void {
    this.destroyTooltip();
    this.container.destroy();
  }

  private draw(): number {
    const { width, height, action, condition, showTooltip } = this.config;
    const compact = this.config.density === 'compact';
    const padX = 8;
    const badgeStartY = 27;
    const maxWidth = width - padX * 2;
    const gapX = compact ? 2 : 3;
    const gapY = compact ? 2 : 3;
    const badgeHeight = compact ? 14 : 16;
    const badgeFontSize = compact ? 9 : 10;
    const maxBadgeRows = this.config.autoHeight ? undefined : compact ? 2 : 3;

    const badgeModel = buildActionCardBadgeModel(condition, action.effects);
    const structuredCondition = getStructuredCondition(condition);
    const badges = [
      ...(structuredCondition.isAlways
        ? []
        : badgeModel.selfBadges.map((badge) => ({ badge, kind: 'condition' as const }))),
      ...badgeModel.targetBadges.map((badge) => ({ badge, kind: 'standard' as const })),
      ...badgeModel.effectBadges.map((badge) => ({ badge, kind: 'standard' as const })),
    ];
    const badgeWidths = badges.map((entry) => this.measureBadgeWidth(entry.badge.text, badgeFontSize));
    const layout = calculateMiniCardBadgeLayout(badgeWidths, {
      startX: padX,
      startY: badgeStartY,
      maxWidth,
      gapX,
      gapY,
      badgeHeight,
      maxRows: maxBadgeRows,
    });
    const requiredHeight = layout.finalCursorY + badgeHeight + 8;
    const actualHeight = this.config.autoHeight ? requiredHeight : height;

    const background = this.scene.add.graphics();
    background.fillStyle(MINI_BG, 0.96);
    background.fillRoundedRect(0, 0, width, actualHeight, 6);
    background.lineStyle(1, MINI_BORDER, 0.95);
    background.strokeRoundedRect(0, 0, width, actualHeight, 6);
    this.container.add(background);

    const title = this.scene.add.text(padX, 5, action.name, {
      fontFamily: UITheme.font.family,
      fontSize: compact ? '12px' : '13px',
      color: UITheme.colors.textPrimary,
    });
    this.container.add(title);

    const summary = action.effects[0] ? this.getMainEffectSummary(action.effects[0]) : '';
    const summaryText = this.scene.add
      .text(width - padX, 5, summary, {
        fontFamily: UITheme.font.family,
        fontSize: compact ? '12px' : '13px',
        color: action.effects[0] ? this.toColorString(getStructuredEffect(action.effects[0]).color) : '#9fb3d8',
      })
      .setOrigin(1, 0);
    this.container.add(summaryText);

    layout.placements.forEach((placement, index) => {
      const entry = badges[index];
      const palette = entry.kind === 'condition' ? CONDITION_PALETTE : this.getBadgePalette(entry.badge.tone);
      const bg = this.scene.add.graphics();
      bg.fillStyle(palette.fill, 0.96);
      bg.fillRoundedRect(placement.x, placement.y, placement.width, badgeHeight, 4);
      bg.lineStyle(1, palette.border, 0.95);
      bg.strokeRoundedRect(placement.x, placement.y, placement.width, badgeHeight, 4);
      this.container.add(bg);

      const label = this.scene.add.text(placement.x + 6, placement.y + 2, entry.badge.text, {
        fontFamily: UITheme.font.family,
        fontSize: `${badgeFontSize}px`,
        color: palette.text,
      });
      this.container.add(label);
    });

    if (layout.overflowed) {
      this.renderOverflowMarker(padX, layout.finalCursorY, badgeHeight, badgeFontSize);
    }

    if (!showTooltip) return actualHeight;

    const hitArea = this.scene.add
      .rectangle(width / 2, actualHeight / 2, width, actualHeight, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => this.showTooltip());
    hitArea.on('pointerout', () => this.destroyTooltip());
    this.container.add(hitArea);
    return actualHeight;
  }

  private showTooltip(): void {
    this.destroyTooltip();

    const { action, condition, rarity, classRestriction, width } = this.config;
    const tooltipWidth = 250;
    const tooltipHeight = 122;
    const { x: worldX, y: worldY } = this.getWorldPosition();
    const x = Phaser.Math.Clamp(worldX - (tooltipWidth - width) / 2, 12, this.scene.scale.width - tooltipWidth - 12);
    const y = Phaser.Math.Clamp(worldY - tooltipHeight - 10, 12, this.scene.scale.height - tooltipHeight - 12);

    const tooltip = this.scene.add.container(x, y);
    const background = this.scene.add.graphics();
    background.fillStyle(0x111625, 0.98);
    background.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);
    background.lineStyle(2, 0x435c8c, 0.95);
    background.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 8);
    tooltip.add(background);

    const rarityText = this.scene.add.text(10, 9, rarity ?? '기본', {
      fontFamily: UITheme.font.family,
      fontSize: '11px',
      color: '#8f9cb7',
    });
    tooltip.add(rarityText);

    const titleText = this.scene.add.text(10, 28, action.name, {
      fontFamily: UITheme.font.family,
      fontSize: '16px',
      color: UITheme.colors.textPrimary,
    });
    tooltip.add(titleText);

    const classText = this.scene.add
      .text(tooltipWidth - 10, 10, classRestriction ?? '공용', {
        fontFamily: UITheme.font.family,
        fontSize: '11px',
        color: '#9dd6ff',
      })
      .setOrigin(1, 0);
    tooltip.add(classText);

    const summaryText = this.scene.add
      .text(tooltipWidth - 10, 29, action.effects[0] ? this.getMainEffectSummary(action.effects[0]) : '', {
        fontFamily: UITheme.font.family,
        fontSize: '14px',
        color: action.effects[0] ? this.toColorString(getStructuredEffect(action.effects[0]).color) : '#9fb3d8',
      })
      .setOrigin(1, 0);
    tooltip.add(summaryText);

    const badgeModel = buildActionCardBadgeModel(condition, action.effects);
    const structuredCondition = getStructuredCondition(condition);
    const badges = [
      ...(structuredCondition.isAlways
        ? []
        : badgeModel.selfBadges.map((badge) => ({ badge, kind: 'condition' as const }))),
      ...badgeModel.targetBadges.map((badge) => ({ badge, kind: 'standard' as const })),
      ...badgeModel.effectBadges.map((badge) => ({ badge, kind: 'standard' as const })),
    ];

    let cursorX = 10;
    let cursorY = 58;
    const gapX = 4;
    const gapY = 4;
    const maxWidth = tooltipWidth - 20;
    const badgeHeight = 18;
    const badgeFontSize = 11;

    for (const entry of badges) {
      const badgeWidth = this.measureBadgeWidth(entry.badge.text, badgeFontSize);
      if (cursorX !== 10 && cursorX + badgeWidth > 10 + maxWidth) {
        cursorX = 10;
        cursorY += badgeHeight + gapY;
      }

      const palette = entry.kind === 'condition' ? CONDITION_PALETTE : this.getBadgePalette(entry.badge.tone);
      const bg = this.scene.add.graphics();
      bg.fillStyle(palette.fill, 0.96);
      bg.fillRoundedRect(cursorX, cursorY, badgeWidth, badgeHeight, 4);
      bg.lineStyle(1, palette.border, 0.95);
      bg.strokeRoundedRect(cursorX, cursorY, badgeWidth, badgeHeight, 4);
      tooltip.add(bg);

      const label = this.scene.add.text(cursorX + 6, cursorY + 2, entry.badge.text, {
        fontFamily: UITheme.font.family,
        fontSize: `${badgeFontSize}px`,
        color: palette.text,
      });
      tooltip.add(label);

      cursorX += badgeWidth + gapX;
    }

    tooltip.setDepth(this.container.depth + 100);
    this.tooltip = tooltip;
  }

  private destroyTooltip(): void {
    this.tooltip?.destroy();
    this.tooltip = null;
  }

  private getWorldPosition(): { x: number; y: number } {
    let x = this.container.x;
    let y = this.container.y;
    let parent = this.container.parentContainer;

    while (parent) {
      x += parent.x;
      y += parent.y;
      parent = parent.parentContainer;
    }

    return { x, y };
  }

  private getMainEffectSummary(effect: Action['effects'][number]): string {
    const structured = getStructuredEffect(effect);

    switch (effect.type) {
      case 'DAMAGE':
        return `${structured.icon} 공격x${effect.value ?? 0}`;
      case 'HEAL':
        return `${structured.icon} 회복${effect.value ?? 0}`;
      case 'SHIELD':
        return `${structured.icon} 실드x${effect.value ?? 0}`;
      case 'MOVE':
        return `${structured.icon} ${structured.valueText} 이동`;
      case 'PUSH':
        return `${structured.icon} ${structured.valueText} 밀침`;
      case 'BUFF':
      case 'DEBUFF':
        return `${structured.icon} ${structured.valueText}`;
      case 'DELAY_TURN':
        return `${structured.icon} 행동지연 ${effect.value ?? 0}`;
      case 'ADVANCE_TURN':
        return `${structured.icon} 행동가속 ${effect.value ?? 0}`;
      case 'REPOSITION':
        return `${structured.icon} ${structured.valueText} 재배치`;
      case 'SWAP':
        return `${structured.icon} 교체`;
      default:
        return [structured.icon, structured.valueText].filter(Boolean).join(' ');
    }
  }

  private measureBadgeWidth(text: string, fontSize: number): number {
    const probe = this.scene.add
      .text(0, 0, text, {
        fontFamily: UITheme.font.family,
        fontSize: `${fontSize}px`,
      })
      .setVisible(false);
    const width = Math.ceil(probe.width) + 12;
    probe.destroy();
    return Math.max(38, width);
  }

  private renderOverflowMarker(x: number, y: number, badgeHeight: number, badgeFontSize: number): void {
    const palette = this.getBadgePalette('neutral');
    const width = this.measureBadgeWidth('…', badgeFontSize);
    const bg = this.scene.add.graphics();
    bg.fillStyle(palette.fill, 0.96);
    bg.fillRoundedRect(x, y, width, badgeHeight, 4);
    bg.lineStyle(1, palette.border, 0.95);
    bg.strokeRoundedRect(x, y, width, badgeHeight, 4);
    this.container.add(bg);

    const label = this.scene.add.text(x + 6, y + 1, '…', {
      fontFamily: UITheme.font.family,
      fontSize: `${badgeFontSize}px`,
      color: palette.text,
    });
    this.container.add(label);
  }

  private getBadgePalette(tone: ActionBadgeTone): BadgePalette {
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

  private toColorString(color: number): string {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
}
