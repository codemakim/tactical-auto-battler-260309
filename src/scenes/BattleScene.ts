import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

export class BattleScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BattleScene' });
  }

  create(): void {
    // 전투 영역 구분선
    const midX = GAME_WIDTH / 2;

    // 배경 영역 표시
    // 플레이어 측
    this.add.rectangle(midX / 2, GAME_HEIGHT / 2, midX - 20, GAME_HEIGHT - 100, 0x16213e, 0.5)
      .setStrokeStyle(1, 0x334466);

    // 적 측
    this.add.rectangle(midX + midX / 2, GAME_HEIGHT / 2, midX - 20, GAME_HEIGHT - 100, 0x2e1a1a, 0.5)
      .setStrokeStyle(1, 0x664433);

    // 레이블
    this.add.text(midX / 2, 30, 'PLAYER', {
      fontSize: '16px', color: '#4a9eff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(midX + midX / 2, 30, 'ENEMY', {
      fontSize: '16px', color: '#ff4a4a', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 포지션 레이블
    this.add.text(midX / 2 - 100, GAME_HEIGHT / 2 - 150, 'FRONT', {
      fontSize: '12px', color: '#335577', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.add.text(midX / 2 + 100, GAME_HEIGHT / 2 - 150, 'BACK', {
      fontSize: '12px', color: '#335577', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 턴 오더 UI (우측)
    this.add.text(GAME_WIDTH - 80, 60, 'TURN ORDER', {
      fontSize: '12px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // 히어로 개입 버튼 (하단)
    const heroBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, '[ HERO INTERVENTION ]', {
      fontSize: '18px', color: '#ffcc00', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    heroBtn.on('pointerover', () => heroBtn.setColor('#ffee66'));
    heroBtn.on('pointerout', () => heroBtn.setColor('#ffcc00'));

    // 뒤로가기
    const backBtn = this.add.text(60, 30, '< BACK', {
      fontSize: '14px', color: '#888888', fontFamily: 'monospace',
    }).setInteractive({ useHandCursor: true });

    backBtn.on('pointerdown', () => this.scene.start('MainMenuScene'));

    // 플레이스홀더 유닛 표시
    this.createPlaceholderUnits();
  }

  private createPlaceholderUnits(): void {
    const midX = GAME_WIDTH / 2;

    // 플레이어 유닛 (FRONT)
    const playerFrontX = midX / 2 - 80;
    const playerBackX = midX / 2 + 80;
    const enemyFrontX = midX + midX / 2 + 80;
    const enemyBackX = midX + midX / 2 - 80;

    const unitPositions = [
      { x: playerFrontX, y: GAME_HEIGHT / 2 - 60, label: 'Warrior', color: 0x4a9eff },
      { x: playerFrontX, y: GAME_HEIGHT / 2 + 60, label: 'Guardian', color: 0x4a9eff },
      { x: playerBackX, y: GAME_HEIGHT / 2, label: 'Archer', color: 0x4a9eff },
      { x: enemyFrontX, y: GAME_HEIGHT / 2 - 60, label: 'Enemy 1', color: 0xff4a4a },
      { x: enemyFrontX, y: GAME_HEIGHT / 2 + 60, label: 'Enemy 2', color: 0xff4a4a },
      { x: enemyBackX, y: GAME_HEIGHT / 2, label: 'Enemy 3', color: 0xff4a4a },
    ];

    for (const unit of unitPositions) {
      // 유닛 박스
      this.add.rectangle(unit.x, unit.y, 70, 70, unit.color, 0.3)
        .setStrokeStyle(2, unit.color);

      // 유닛 이름
      this.add.text(unit.x, unit.y + 50, unit.label, {
        fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
      }).setOrigin(0.5);

      // HP 바
      this.add.rectangle(unit.x, unit.y + 40, 60, 6, 0x333333).setStrokeStyle(1, 0x555555);
      this.add.rectangle(unit.x, unit.y + 40, 60, 6, 0x44cc44);
    }
  }
}
