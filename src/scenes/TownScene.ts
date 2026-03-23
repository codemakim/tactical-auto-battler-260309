/**
 * TownScene — 마을 허브 화면
 * HoMM 도시 화면 컨셉: 건물 클릭 → 기능 패널 열림
 * 다이아몬드 배치 + 크기/색상 차별화 + 클릭 피드백
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIModal } from '../ui/UIModal';

// 건물 크기 등급
type BuildingSize = 'xl' | 'lg' | 'md' | 'sm';

const BUILDING_SIZES: Record<
  BuildingSize,
  { width: number; height: number; iconSize: string; nameStyle: 'body' | 'label' }
> = {
  xl: { width: 220, height: 130, iconSize: '44px', nameStyle: 'body' },
  lg: { width: 160, height: 110, iconSize: '36px', nameStyle: 'body' },
  md: { width: 140, height: 100, iconSize: '32px', nameStyle: 'label' },
  sm: { width: 120, height: 90, iconSize: '28px', nameStyle: 'label' },
};

interface BuildingDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  x: number;
  y: number;
  size: BuildingSize;
  color: number; // 건물 고유 색상
  borderColor: number; // 테두리 색상
  implemented: boolean;
}

// 1280x720 기준, 다이아몬드 배치
// 상단: 훈련소 (성장)
// 중단 좌: 병영 (유닛)  |  중단 우: 작전실 (전략)
// 하단 좌: 상점         |  하단 우: 설정
// 하단 중앙: 출격 게이트 (가장 크고 눈에 띄게)
const CX = GAME_WIDTH / 2; // 640

const BUILDINGS: BuildingDef[] = [
  {
    id: 'training',
    name: '훈련소',
    icon: '💪',
    description: '골드를 소모하여 캐릭터를 강화합니다.',
    x: CX,
    y: 180,
    size: 'lg',
    color: 0x0d3b2e,
    borderColor: 0x10b981,
    implemented: false,
  },
  {
    id: 'barracks',
    name: '병영',
    icon: '⚔',
    description: '보유 캐릭터를 확인하고 관리합니다.',
    x: 240,
    y: 310,
    size: 'md',
    color: 0x1a2a4a,
    borderColor: 0x3b82f6,
    implemented: false,
  },
  {
    id: 'warroom',
    name: '작전실',
    icon: '📋',
    description: '전투에 내보낼 파티를 편성합니다.',
    x: 1040,
    y: 310,
    size: 'md',
    color: 0x2a1a3a,
    borderColor: 0x8b5cf6,
    implemented: true,
  },
  {
    id: 'shop',
    name: '상점',
    icon: '🛒',
    description: '아이템과 액션 카드를 구매합니다.',
    x: 240,
    y: 480,
    size: 'sm',
    color: 0x2a2a1a,
    borderColor: 0x78716c,
    implemented: false,
  },
  {
    id: 'settings',
    name: '설정',
    icon: '⚙',
    description: '게임 설정을 변경합니다.',
    x: 1040,
    y: 480,
    size: 'sm',
    color: 0x1a1a2a,
    borderColor: 0x6b7280,
    implemented: false,
  },
  {
    id: 'sortie',
    name: '출격 게이트',
    icon: '🚪',
    description: '전장을 선택하고 출격합니다.',
    x: CX,
    y: 500,
    size: 'xl',
    color: 0x3a2a0a,
    borderColor: 0xf59e0b,
    implemented: true,
  },
];

export class TownScene extends Phaser.Scene {
  private gold: number = 1000;
  private goldText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'TownScene' });
  }

  create(): void {
    this.drawBackground();
    this.drawTopBar();
    this.createBuildings();
    this.drawTownLabel();
  }

  /** 마을 배경 (야경 + 지면) */
  private drawBackground(): void {
    const gfx = this.add.graphics();

    // 하늘 그라데이션
    const skyColors = [0x0a0a1e, 0x101028, 0x181838, 0x1e2848];
    const bandH = GAME_HEIGHT / skyColors.length;
    for (let i = 0; i < skyColors.length; i++) {
      gfx.fillStyle(skyColors[i], 1);
      gfx.fillRect(0, i * bandH, GAME_WIDTH, bandH + 1);
    }

    // 지면
    gfx.fillStyle(0x141e14, 1);
    gfx.fillRect(0, GAME_HEIGHT - 120, GAME_WIDTH, 120);
    gfx.lineStyle(1, 0x2a3a2a);
    gfx.lineBetween(0, GAME_HEIGHT - 120, GAME_WIDTH, GAME_HEIGHT - 120);

    // 별
    for (let i = 0; i < 50; i++) {
      const sx = Phaser.Math.Between(10, GAME_WIDTH - 10);
      const sy = Phaser.Math.Between(10, GAME_HEIGHT / 3);
      const alpha = Phaser.Math.FloatBetween(0.15, 0.65);
      gfx.fillStyle(0xffffff, alpha);
      gfx.fillRect(sx, sy, 2, 2);
    }
  }

  /** 상단 정보 바 */
  private drawTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.85);
    bar.fillRect(0, 0, GAME_WIDTH, 50);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, 50, GAME_WIDTH, 50);
    bar.setDepth(10);

    this.add
      .text(20, 14, '마을', {
        ...UITheme.font.heading,
        color: UITheme.colors.textPrimary,
      })
      .setDepth(11);

    this.goldText = this.add
      .text(GAME_WIDTH - 20, 14, `Gold: ${this.gold}`, {
        ...UITheme.font.body,
        color: '#ffcc00',
      })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  /** 건물 전체 생성 */
  private createBuildings(): void {
    for (const bld of BUILDINGS) {
      this.createBuilding(bld);
    }
  }

  /** 개별 건물 생성 */
  private createBuilding(def: BuildingDef): Phaser.GameObjects.Container {
    const sizeInfo = BUILDING_SIZES[def.size];
    const { width: bw, height: bh } = sizeInfo;
    const container = this.add.container(def.x, def.y);

    // 건물 본체
    const body = this.add.graphics();
    this.drawBuildingBody(body, bw, bh, def.color, def.borderColor, 1);
    container.add(body);

    // 아이콘
    const icon = this.add
      .text(0, -bh * 0.12, def.icon, {
        fontSize: sizeInfo.iconSize,
        fontFamily: UITheme.font.family,
      })
      .setOrigin(0.5);
    container.add(icon);

    // 건물 이름
    const nameFont = sizeInfo.nameStyle === 'body' ? UITheme.font.body : UITheme.font.label;
    const nameText = this.add
      .text(0, bh * 0.32, def.name, {
        ...nameFont,
        color: UITheme.colors.textPrimary,
      })
      .setOrigin(0.5);
    container.add(nameText);

    // 클릭 영역
    const hitArea = this.add.rectangle(0, 0, bw, bh, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Hover: 테두리 강조 + 이름 색상 변경
    hitArea.on('pointerover', () => {
      this.drawBuildingBody(body, bw, bh, def.color, def.borderColor, 1.5);
      nameText.setColor(this.colorToHex(def.borderColor));
    });

    hitArea.on('pointerout', () => {
      this.drawBuildingBody(body, bw, bh, def.color, def.borderColor, 1);
      nameText.setColor(UITheme.colors.textPrimary);
    });

    // 클릭: scale tween + 기능 실행
    hitArea.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        ease: 'Power1',
        onComplete: () => {
          this.onBuildingClick(def);
        },
      });
    });

    // 출격 게이트: breathing 애니메이션
    if (def.id === 'sortie') {
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    return container;
  }

  /** 건물 박스 그리기 (hover 강도 조절용) */
  private drawBuildingBody(
    gfx: Phaser.GameObjects.Graphics,
    w: number,
    h: number,
    fillColor: number,
    borderColor: number,
    borderAlpha: number,
  ): void {
    gfx.clear();
    gfx.fillStyle(fillColor, 0.9);
    gfx.fillRoundedRect(-w / 2, -h / 2, w, h, 6);

    // 테두리 — hover 시 borderAlpha > 1이면 더 밝은 색으로
    const lineWidth = borderAlpha > 1 ? 3 : 2;
    gfx.lineStyle(lineWidth, borderColor, Math.min(borderAlpha, 1));
    gfx.strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
  }

  /** 숫자 색상 → hex 문자열 */
  private colorToHex(color: number): string {
    return '#' + color.toString(16).padStart(6, '0');
  }

  /** 건물 클릭 핸들러 */
  private onBuildingClick(def: BuildingDef): void {
    if (def.implemented) {
      this.openBuildingFeature(def);
    } else {
      new UIModal(this, {
        title: def.name,
        content: `${def.description}\n\n[ 준비 중 ]`,
      });
    }
  }

  /** 구현된 건물 기능 열기 */
  private openBuildingFeature(def: BuildingDef): void {
    switch (def.id) {
      case 'sortie':
        this.scene.start('SortieScene');
        break;
      case 'warroom':
        this.scene.start('FormationScene');
        break;
      default:
        new UIModal(this, {
          title: def.name,
          content: def.description,
        });
    }
  }

  /** 하단 라벨 */
  private drawTownLabel(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 14, 'Tactical Auto-Battle Roguelike', {
        ...UITheme.font.small,
        color: '#333348',
      })
      .setOrigin(0.5);
  }
}
