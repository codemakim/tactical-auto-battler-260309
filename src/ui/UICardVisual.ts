/**
 * 카드 비주얼 컴포넌트
 *
 * RewardScene, FormationScene 등에서 공용으로 사용.
 * 카드 정보를 시각적으로 표현하는 컨테이너.
 */
import Phaser from 'phaser';
import { UITheme } from './UITheme';
import { Rarity } from '../types';
import type { Action, ActionEffect } from '../types';

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
  rarity?: string; // undefined이면 "기본" 표시
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

    this.container = scene.add.container(cfg.x, cfg.y);

    // 배경
    this.bg = scene.add.graphics();
    this.drawBg(cfg.selected ?? false);
    this.container.add(this.bg);

    let ty = 8;

    // 레어리티 / "기본" 라벨
    const rarityLabel = cfg.rarity ?? '기본';
    const rarityColor = cfg.rarity ? (RARITY_TEXT[cfg.rarity] ?? '#ccccdd') : '#555566';
    this.addText(scene, w / 2, ty, rarityLabel, { fontSize: '10px', color: rarityColor });
    ty += 16;

    // 액션 이름
    this.addText(scene, w / 2, ty, cfg.action.name, {
      fontSize: '12px',
      color: '#e0e0e0',
    });
    ty += 20;

    // 클래스 제한
    const classLabel = cfg.classRestriction ?? '공용';
    this.addText(scene, w / 2, ty, classLabel, {
      fontSize: '10px',
      color: cfg.classRestriction ? '#4a9eff' : '#667788',
    });
    ty += 18;

    // 효과 요약 (최대 3개)
    for (const effect of cfg.action.effects.slice(0, 3)) {
      const valueStr = effect.value ? ` x${effect.value}` : '';
      this.addText(scene, w / 2, ty, `${effect.type}${valueStr}`, {
        fontSize: '10px',
        color: '#778899',
      });
      ty += 14;
    }

    // 조건 (하단)
    if (cfg.action.effects.length > 0) {
      const target = cfg.action.effects[0].target;
      if (target && 'side' in target) {
        const targetLabel =
          target.side === 'SELF' ? 'SELF' : `${target.side}_${(target as { position?: string }).position ?? ''}`;
        this.addText(scene, w / 2, h - 14, targetLabel, {
          fontSize: '9px',
          color: '#556677',
        });
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
