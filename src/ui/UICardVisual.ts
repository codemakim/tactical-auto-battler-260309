/**
 * 카드 비주얼 컴포넌트
 *
 * RewardScene, FormationScene 등에서 공용으로 사용.
 * 카드 정보를 시각적으로 표현하는 컨테이너.
 * 효과를 뱃지/태그 형태로 시각적으로 분리해서 표시.
 */
import Phaser from 'phaser';
import { UITheme } from './UITheme';
import { Rarity } from '../types';
import type { Action, ActionCondition } from '../types';
import { getStructuredEffect, getStructuredCondition } from '../utils/actionText';
import type { StructuredEffectData } from '../utils/actionText';

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

/** 색상 number → '#rrggbb' 문자열 */
function colorToStr(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`;
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
    const fontSize = compact ? '8px' : '9px';
    const nameFontSize = compact ? '10px' : '12px';

    this.container = scene.add.container(cfg.x, cfg.y);

    // 배경
    this.bg = scene.add.graphics();
    this.drawBg(cfg.selected ?? false);
    this.container.add(this.bg);

    let ty = 6;

    // 레어리티 라벨
    const rarityLabel = cfg.rarity ?? '기본';
    const rarityColor = cfg.rarity ? (RARITY_TEXT[cfg.rarity] ?? '#ccccdd') : '#555566';
    this.addText(scene, w / 2, ty, rarityLabel, { fontSize: compact ? '8px' : '10px', color: rarityColor });
    ty += compact ? 12 : 15;

    // 액션 이름
    this.addText(scene, w / 2, ty, cfg.action.name, {
      fontSize: nameFontSize,
      color: UITheme.colors.textPrimary,
    });
    ty += compact ? 14 : 18;

    // 클래스 제한
    const classLabel = cfg.classRestriction ?? '공용';
    this.addText(scene, w / 2, ty, classLabel, {
      fontSize: compact ? '8px' : '10px',
      color: cfg.classRestriction ? UITheme.colors.textAccent : '#667788',
    });
    ty += compact ? 12 : 16;

    // 조건 뱃지
    if (cfg.condition) {
      const cond = getStructuredCondition(cfg.condition);
      if (!cond.isAlways) {
        ty = this.renderConditionBadge(scene, ty, cond.text, w, compact);
      }
    }

    // 효과 뱃지 (최대 3개)
    const effects = cfg.action.effects.slice(0, 3);
    for (const effect of effects) {
      const data = getStructuredEffect(effect);
      ty = this.renderEffectBadge(scene, ty, data, w, compact);
    }

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

  private renderConditionBadge(scene: Phaser.Scene, y: number, text: string, cardW: number, compact: boolean): number {
    const padX = 4;
    const padY = 2;
    const fontSize = compact ? 7 : 8;
    const maxTextW = cardW - 12;

    const g = scene.add.graphics();
    g.fillStyle(UITheme.colors.bgPanelLight, 0.9);
    g.fillRoundedRect(4, y, cardW - 8, fontSize + padY * 2 + 2, 3);
    g.lineStyle(1, UITheme.colors.border, 0.6);
    g.strokeRoundedRect(4, y, cardW - 8, fontSize + padY * 2 + 2, 3);
    this.container.add(g);

    const t = scene.add
      .text(padX + 6, y + padY + 1, text, {
        fontFamily: UITheme.font.family,
        fontSize: `${fontSize}px`,
        color: UITheme.colors.textSecondary,
      })
      .setOrigin(0, 0);
    if (t.width > maxTextW) {
      t.setScale(maxTextW / t.width);
    }
    this.container.add(t);

    return y + fontSize + padY * 2 + 5;
  }

  private renderEffectBadge(
    scene: Phaser.Scene,
    y: number,
    data: StructuredEffectData,
    cardW: number,
    compact: boolean,
  ): number {
    const fontSize = compact ? 7 : 9;
    const rowH = fontSize + 6;
    const padX = 6;

    // 아이콘
    const iconText = scene.add
      .text(padX, y + 2, data.icon, {
        fontFamily: UITheme.font.family,
        fontSize: `${fontSize + 1}px`,
        color: colorToStr(data.color),
      })
      .setOrigin(0, 0);
    this.container.add(iconText);

    // 수치
    const valueX = padX + (compact ? 10 : 14);
    const valText = scene.add
      .text(valueX, y + 2, data.valueText, {
        fontFamily: UITheme.font.family,
        fontSize: `${fontSize}px`,
        color: UITheme.colors.textPrimary,
      })
      .setOrigin(0, 0);
    this.container.add(valText);

    // 타겟 뱃지 (compact 모드에서는 생략)
    if (!compact && data.targetText) {
      const targetX = valueX + valText.width + 4;
      const maxTargetW = cardW - targetX - 4;

      const tgt = scene.add
        .text(targetX, y + 2, data.targetText, {
          fontFamily: UITheme.font.family,
          fontSize: `${fontSize - 1}px`,
          color: colorToStr(data.color),
        })
        .setOrigin(0, 0)
        .setAlpha(0.7);
      if (tgt.width > maxTargetW && maxTargetW > 0) {
        tgt.setScale(maxTargetW / tgt.width);
      }
      this.container.add(tgt);
    }

    return y + rowH;
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
