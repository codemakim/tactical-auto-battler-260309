import Phaser from 'phaser';
import { gameState } from '../core/GameState';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // 로딩 바 표시
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222244, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x4a9eff, 1);
      progressBar.fillRect(width / 2 - 155, height / 2 - 10, 310 * value, 20);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
    });

    // 배경 이미지
    this.load.image('town-bg', 'src/assets/backgrounds/town-bg.png');

    // 스프라이트시트
    this.load.spritesheet('warrior-attack', 'src/assets/sprites/warrior-attack.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
    this.load.spritesheet('warrior-hit', 'src/assets/sprites/warrior-hit.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
    this.load.spritesheet('assassin-attack', 'src/assets/sprites/assassin-attack.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
    this.load.spritesheet('archer-attack', 'src/assets/sprites/archer-attack.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
    this.load.spritesheet('guardian-attack', 'src/assets/sprites/guardian-attack.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
    this.load.spritesheet('controller-attack', 'src/assets/sprites/controller-attack.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
    this.load.spritesheet('guardian-hit', 'src/assets/sprites/guardian-hit.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
    this.load.spritesheet('archer-hit', 'src/assets/sprites/archer-hit.png', {
      frameWidth: 768,
      frameHeight: 448,
    });
  }

  create(): void {
    gameState.loadFromStorage();

    // 워리어 공격 애니메이션 (프레임 0 = idle, 1~28 = attack, 29~31은 빈 프레임)
    this.anims.create({
      key: 'warrior-attack-anim',
      frames: this.anims.generateFrameNumbers('warrior-attack', { start: 1, end: 28 }),
      frameRate: 20,
      repeat: 0,
    });

    // 어쌔신 공격 애니메이션 (프레임 0 = idle, 1~31 = attack)
    this.anims.create({
      key: 'assassin-attack-anim',
      frames: this.anims.generateFrameNumbers('assassin-attack', { start: 1, end: 31 }),
      frameRate: 20,
      repeat: 0,
    });

    // 아처 공격 애니메이션 (프레임 1~27, 0과 28은 미사용, idle=27)
    this.anims.create({
      key: 'archer-attack-anim',
      frames: this.anims.generateFrameNumbers('archer-attack', { start: 1, end: 27 }),
      frameRate: 20,
      repeat: 0,
    });

    // 컨트롤러 공격 애니메이션 (프레임 0 = idle, 1~28 = attack)
    this.anims.create({
      key: 'controller-attack-anim',
      frames: this.anims.generateFrameNumbers('controller-attack', { start: 1, end: 28 }),
      frameRate: 20,
      repeat: 0,
    });

    // 가디언 행동 애니메이션 (프레임 0 = idle, 1~20 = casting)
    this.anims.create({
      key: 'guardian-attack-anim',
      frames: this.anims.generateFrameNumbers('guardian-attack', { start: 1, end: 20 }),
      frameRate: 20,
      repeat: 0,
    });

    // 워리어 피격 애니메이션 (처음 9프레임 스킵, 프레임 9~28)
    this.anims.create({
      key: 'warrior-hit-anim',
      frames: this.anims.generateFrameNumbers('warrior-hit', { start: 9, end: 28 }),
      frameRate: 20,
      repeat: 0,
    });

    // 아처 피격 애니메이션 (프레임 0~24, 마지막 줄 3칸 빈 프레임)
    this.anims.create({
      key: 'archer-hit-anim',
      frames: this.anims.generateFrameNumbers('archer-hit', { start: 0, end: 24 }),
      frameRate: 20,
      repeat: 0,
    });

    // 가디언 피격 애니메이션 (프레임 0~28, 마지막 줄 3칸 빈 프레임)
    this.anims.create({
      key: 'guardian-hit-anim',
      frames: this.anims.generateFrameNumbers('guardian-hit', { start: 0, end: 28 }),
      frameRate: 20,
      repeat: 0,
    });

    this.scene.start('MainMenuScene');
  }
}
