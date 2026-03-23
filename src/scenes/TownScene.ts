/**
 * TownScene — 마을 허브 화면
 * HoMM 도시 화면 컨셉: 건물 클릭 → 기능 패널 열림
 *
 * 건물 목록:
 * - 병영 (Barracks) — 보유 캐릭터
 * - 훈련소 (Training Ground) — 캐릭터 강화
 * - 작전실 (War Room) — 편성 관리
 * - 출격 게이트 (Sortie Gate) — 전장 선택
 * - 상점 (Shop) — 향후 구현
 * - 설정 (Settings) — 향후 구현
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIModal } from '../ui/UIModal';

interface BuildingDef {
  id: string;
  name: string;
  icon: string; // 이모지 아이콘 (향후 스프라이트로 교체)
  description: string;
  x: number;
  y: number;
  implemented: boolean;
  large?: boolean;
}

const BUILDINGS: BuildingDef[] = [
  {
    id: 'barracks',
    name: '병영',
    icon: '⚔',
    description: '보유 캐릭터를 확인하고 관리합니다.',
    x: 160,
    y: 280,
    implemented: false,
  },
  {
    id: 'training',
    name: '훈련소',
    icon: '💪',
    description: '골드를 소모하여 캐릭터를 강화합니다.',
    x: 420,
    y: 220,
    implemented: false,
  },
  {
    id: 'warroom',
    name: '작전실',
    icon: '📋',
    description: '전투에 내보낼 파티를 편성합니다.',
    x: 680,
    y: 250,
    implemented: false,
  },
  {
    id: 'sortie',
    name: '출격 게이트',
    icon: '🚪',
    description: '전장을 선택하고 출격합니다.',
    x: 820,
    y: 450,
    implemented: false,
    large: true,
  },
  {
    id: 'shop',
    name: '상점',
    icon: '🛒',
    description: '아이템과 액션 카드를 구매합니다.',
    x: 300,
    y: 450,
    implemented: false,
  },
  {
    id: 'settings',
    name: '설정',
    icon: '⚙',
    description: '게임 설정을 변경합니다.',
    x: 940,
    y: 280,
    implemented: false,
  },
];

export class TownScene extends Phaser.Scene {
  private gold: number = 1000; // 임시 초기값
  private goldText!: Phaser.GameObjects.Text;
  private buildingContainers: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'TownScene' });
  }

  create(): void {
    this.drawBackground();
    this.drawTopBar();
    this.createBuildings();
    this.drawTownLabel();
  }

  /** 마을 배경 (그라데이션 + 지면) */
  private drawBackground(): void {
    const gfx = this.add.graphics();

    // 하늘 그라데이션
    const skyColors = [0x0a0a1e, 0x141430, 0x1e2848];
    const bandH = GAME_HEIGHT / skyColors.length;
    for (let i = 0; i < skyColors.length; i++) {
      gfx.fillStyle(skyColors[i], 1);
      gfx.fillRect(0, i * bandH, GAME_WIDTH, bandH + 1);
    }

    // 지면
    gfx.fillStyle(0x1a2a1a, 1);
    gfx.fillRect(0, GAME_HEIGHT - 140, GAME_WIDTH, 140);

    // 지면 경계선
    gfx.lineStyle(2, 0x2a3a2a);
    gfx.lineBetween(0, GAME_HEIGHT - 140, GAME_WIDTH, GAME_HEIGHT - 140);

    // 간단한 별 효과
    for (let i = 0; i < 40; i++) {
      const sx = Phaser.Math.Between(10, GAME_WIDTH - 10);
      const sy = Phaser.Math.Between(10, GAME_HEIGHT / 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.7);
      gfx.fillStyle(0xffffff, alpha);
      gfx.fillRect(sx, sy, 2, 2);
    }
  }

  /** 상단 정보 바 */
  private drawTopBar(): void {
    // 상단 바 배경
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.85);
    bar.fillRect(0, 0, GAME_WIDTH, 50);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, 50, GAME_WIDTH, 50);
    bar.setDepth(10);

    // 마을 이름
    this.add
      .text(20, 14, '마을', {
        ...UITheme.font.heading,
        color: UITheme.colors.textPrimary,
      })
      .setDepth(11);

    // 골드
    this.goldText = this.add
      .text(GAME_WIDTH - 20, 14, `Gold: ${this.gold}`, {
        ...UITheme.font.body,
        color: '#ffcc00',
      })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  /** 건물 생성 */
  private createBuildings(): void {
    for (const bld of BUILDINGS) {
      const container = this.createBuilding(bld);
      this.buildingContainers.push(container);
    }
  }

  /** 개별 건물 생성 */
  private createBuilding(def: BuildingDef): Phaser.GameObjects.Container {
    const container = this.add.container(def.x, def.y);

    // 건물 본체 (사각형) — 출격 게이트는 크게
    const bldWidth = def.large ? 180 : 120;
    const bldHeight = def.large ? 120 : 100;
    const body = this.add.graphics();
    body.fillStyle(def.large ? 0x2a2244 : 0x222244, 0.9);
    body.fillRoundedRect(-bldWidth / 2, -bldHeight / 2, bldWidth, bldHeight, 6);
    body.lineStyle(2, def.large ? UITheme.colors.borderLight : UITheme.colors.border);
    body.strokeRoundedRect(-bldWidth / 2, -bldHeight / 2, bldWidth, bldHeight, 6);
    container.add(body);

    // 아이콘
    const icon = this.add
      .text(0, def.large ? -22 : -16, def.icon, {
        fontSize: def.large ? '40px' : '32px',
        fontFamily: UITheme.font.family,
      })
      .setOrigin(0.5);
    container.add(icon);

    // 건물 이름
    const nameText = this.add
      .text(0, def.large ? 34 : 28, def.name, {
        ...(def.large ? UITheme.font.body : UITheme.font.label),
        color: UITheme.colors.textPrimary,
      })
      .setOrigin(0.5);
    container.add(nameText);

    // 클릭 영역
    const hitArea = this.add.rectangle(0, 0, bldWidth, bldHeight, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // Hover 효과
    hitArea.on('pointerover', () => {
      body.clear();
      body.fillStyle(0x2a2a5a, 0.95);
      body.fillRoundedRect(-bldWidth / 2, -bldHeight / 2, bldWidth, bldHeight, 6);
      body.lineStyle(2, UITheme.colors.borderHighlight);
      body.strokeRoundedRect(-bldWidth / 2, -bldHeight / 2, bldWidth, bldHeight, 6);
      nameText.setColor(UITheme.colors.textAccent);
    });

    hitArea.on('pointerout', () => {
      body.clear();
      body.fillStyle(0x222244, 0.9);
      body.fillRoundedRect(-bldWidth / 2, -bldHeight / 2, bldWidth, bldHeight, 6);
      body.lineStyle(2, UITheme.colors.border);
      body.strokeRoundedRect(-bldWidth / 2, -bldHeight / 2, bldWidth, bldHeight, 6);
      nameText.setColor(UITheme.colors.textPrimary);
    });

    // 클릭 처리
    hitArea.on('pointerdown', () => {
      this.onBuildingClick(def);
    });

    return container;
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

  /** 구현된 건물 기능 열기 (향후 확장) */
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

  /** 하단 마을 라벨 */
  private drawTownLabel(): void {
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 20, 'Tactical Auto-Battle Roguelike — Town', {
        ...UITheme.font.small,
        color: '#444466',
      })
      .setOrigin(0.5);
  }
}
