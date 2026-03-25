/**
 * 플로팅 텍스트 컴포넌트
 *
 * 전투 중 유닛 근처에 데미지/쉴드/힐 숫자를 RPG 스타일로 표시.
 * 생성 즉시 애니메이션 시작, 800ms 후 자동 파괴.
 */
import Phaser from 'phaser';
import { UITheme } from './UITheme';
import type { FloatingTextType } from '../types';

const TEXT_CONFIG: Record<FloatingTextType, { color: string; prefix: string; suffix: string; fontSize: string }> = {
  DAMAGE: { color: '#ff4444', prefix: '-', suffix: '', fontSize: '20px' },
  SHIELD: { color: '#4a9eff', prefix: '+', suffix: ' 🛡', fontSize: '20px' },
  HEAL: { color: '#44cc44', prefix: '+', suffix: '', fontSize: '20px' },
  MISS: { color: '#888899', prefix: '', suffix: '', fontSize: '14px' },
  BUFF: { color: '#ffcc00', prefix: '', suffix: '', fontSize: '14px' },
  DEBUFF: { color: '#cc44cc', prefix: '', suffix: '', fontSize: '14px' },
  DEATH: { color: '#ff4444', prefix: '', suffix: '', fontSize: '20px' },
};

export interface UIFloatingTextConfig {
  type: FloatingTextType;
  value?: number;
  label?: string;
}

export class UIFloatingText {
  constructor(scene: Phaser.Scene, x: number, y: number, config: UIFloatingTextConfig) {
    const cfg = TEXT_CONFIG[config.type];

    // 텍스트 내용 결정
    let content: string;
    if (config.type === 'DEATH') {
      content = '💀';
    } else if (config.type === 'MISS') {
      content = 'MISS';
    } else if (config.value != null) {
      content = `${cfg.prefix}${config.value}${cfg.suffix}`;
    } else if (config.label) {
      content = config.label;
    } else {
      content = config.type;
    }

    // 겹침 방지 랜덤 X 오프셋
    const offsetX = Phaser.Math.Between(-20, 20);

    const text = scene.add
      .text(x + offsetX, y, content, {
        fontSize: cfg.fontSize,
        fontFamily: UITheme.font.family,
        fontStyle: config.value != null ? 'bold' : 'normal',
        color: cfg.color,
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(150);

    // 떠오르면서 페이드인/아웃
    scene.tweens.add({
      targets: text,
      alpha: { from: 0, to: 1 },
      y: y - 30,
      duration: 400,
      ease: 'Power2',
    });

    scene.tweens.add({
      targets: text,
      alpha: 0,
      duration: 400,
      delay: 400,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }
}
