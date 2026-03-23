/**
 * UIToast — 화면 하단에 잠시 나타났다 사라지는 알림 메시지
 * 재사용 가능한 공통 컴포넌트
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from './UITheme';

export interface UIToastConfig {
  /** 표시 Y 위치 (기본: 화면 하단에서 80px 위) */
  y?: number;
  /** 표시 시간 ms (기본: 2000) */
  duration?: number;
}

export class UIToast {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private text: Phaser.GameObjects.Text;
  private scene: Phaser.Scene;
  private baseY: number;
  private duration: number;
  private hideTimer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, config?: UIToastConfig) {
    this.scene = scene;
    this.baseY = config?.y ?? GAME_HEIGHT - 80;
    this.duration = config?.duration ?? 2000;

    this.container = scene.add.container(GAME_WIDTH / 2, this.baseY);
    this.container.setDepth(50);
    this.container.setAlpha(0); // 처음에는 숨김

    this.bg = scene.add.graphics();
    this.container.add(this.bg);

    this.text = scene.add
      .text(0, 0, '', {
        ...UITheme.font.body,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.container.add(this.text);
  }

  /** 토스트 메시지 표시 — 기존 메시지가 있으면 교체 */
  show(message: string): void {
    // 기존 타이머 취소
    if (this.hideTimer) {
      this.hideTimer.destroy();
      this.hideTimer = undefined;
    }

    this.text.setText(message);

    // 배경 크기를 텍스트에 맞춤
    const pw = 24;
    const ph = 10;
    const w = this.text.width + pw * 2;
    const h = this.text.height + ph * 2;

    this.bg.clear();
    this.bg.fillStyle(0x1a3a5a, 0.9);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    this.bg.lineStyle(1, 0x4a8abb);
    this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);

    // 페이드 인
    this.container.setAlpha(0);
    this.container.setY(this.baseY + 10);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      y: this.baseY,
      duration: 150,
      ease: 'Power2',
    });

    // 일정 시간 후 페이드 아웃
    this.hideTimer = this.scene.time.delayedCall(this.duration, () => {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        y: this.baseY - 10,
        duration: 300,
        ease: 'Power2',
      });
    });
  }

  destroy(): void {
    if (this.hideTimer) this.hideTimer.destroy();
    this.container.destroy();
  }
}
