import Phaser from 'phaser';

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
  }

  create(): void {
    // 워리어 공격 애니메이션 (프레임 0 = idle, 1~25 = attack)
    this.anims.create({
      key: 'warrior-attack-anim',
      frames: this.anims.generateFrameNumbers('warrior-attack', { start: 1, end: 25 }),
      frameRate: 18,
      repeat: 0,
    });

    this.scene.start('MainMenuScene');
  }
}
