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
import { getStructuredEffect, getStructuredCondition } from '../utils/actionText';

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

    this.container = scene.add.container(cfg.x, cfg.y);

    // 배경
    this.bg = scene.add.graphics();
    this.drawBg(cfg.selected ?? false);
    this.container.add(this.bg);

    let ty = 5;
    const padX = 6;
    const labelSize = compact ? 7 : 8;
    const valueSize = compact ? 8 : 10;

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

    // ── 조건 섹션 ──
    if (cfg.condition) {
      const cond = getStructuredCondition(cfg.condition);
      if (!cond.isAlways) {
        this.addLabel(scene, padX, ty, '조건', labelSize);
        this.addValue(scene, padX + (compact ? 22 : 28), ty, cond.text, valueSize, UITheme.colors.textSecondary, w);
        ty += compact ? 11 : 14;
      }
    }

    // ── 효과 섹션 ──
    const effects = cfg.action.effects.slice(0, 3);
    for (const effect of effects) {
      const data = getStructuredEffect(effect);

      // 효과: 아이콘 + 수치
      const iconTxt = scene.add
        .text(padX, ty, data.icon, {
          fontFamily: UITheme.font.family,
          fontSize: `${valueSize}px`,
          color: colorToStr(data.color),
        })
        .setOrigin(0, 0);
      this.container.add(iconTxt);

      const valTxt = scene.add
        .text(padX + (compact ? 10 : 14), ty, data.valueText, {
          fontFamily: UITheme.font.family,
          fontSize: `${valueSize}px`,
          color: UITheme.colors.textPrimary,
        })
        .setOrigin(0, 0);
      this.container.add(valTxt);
      ty += compact ? 11 : 13;

      // 대상: → 텍스트 (compact에서도 표시, 한 줄 들여쓰기)
      if (data.targetText) {
        const arrow = scene.add
          .text(padX + 4, ty, `→ ${data.targetText}`, {
            fontFamily: UITheme.font.family,
            fontSize: `${labelSize}px`,
            color: colorToStr(data.color),
          })
          .setOrigin(0, 0)
          .setAlpha(0.7);
        const maxW = w - padX - 8;
        if (arrow.width > maxW && maxW > 0) {
          arrow.setScale(maxW / arrow.width);
        }
        this.container.add(arrow);
        ty += compact ? 9 : 11;
      }
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

  private addValue(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    fontSize: number,
    color: string,
    cardW: number,
  ): void {
    const t = scene.add
      .text(x, y, text, {
        fontFamily: UITheme.font.family,
        fontSize: `${fontSize}px`,
        color,
      })
      .setOrigin(0, 0);
    const maxW = cardW - x - 4;
    if (t.width > maxW && maxW > 0) {
      t.setScale(maxW / t.width);
    }
    this.container.add(t);
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
