/**
 * TownScene — 마을 허브 화면
 * 배경 일러스트 위에 투명 히트박스를 배치하여 건물 클릭 처리
 * Hover 시 건물 이름 + 밝기 효과, 클릭 시 기능 실행
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIModal } from '../ui/UIModal';
import { UIPanel } from '../ui/UIPanel';
import { UIButton } from '../ui/UIButton';
import { gameState } from '../core/GameState';
import { formatTownHeaderHeroInfo } from '../systems/TownHeader';
import { getBarracksRosterSummary, getCharacterDetailViewModel } from '../systems/BarracksDetail';
import type { CharacterDefinition } from '../types';

interface BuildingDef {
  id: string;
  name: string;
  description: string;
  x: number; // 히트박스 중심 x (1280 기준)
  y: number; // 히트박스 중심 y (720 기준)
  hitWidth: number;
  hitHeight: number;
  labelOffsetY: number; // 이름 라벨 y 오프셋 (히트박스 상단 기준)
  implemented: boolean;
}

// 이미지 내 건물 위치에 맞춘 히트박스 좌표 (1280x720 기준)
const CX = GAME_WIDTH / 2;

const BUILDINGS: BuildingDef[] = [
  {
    id: 'training',
    name: '훈련소',
    description: '골드를 소모하여 캐릭터를 강화합니다.',
    x: CX - 30,
    y: 170,
    hitWidth: 240,
    hitHeight: 130,
    labelOffsetY: -75,
    implemented: false,
  },
  {
    id: 'barracks',
    name: '병영',
    description: '보유 캐릭터를 확인하고 관리합니다.',
    x: 180,
    y: 330,
    hitWidth: 270,
    hitHeight: 150,
    labelOffsetY: -75,
    implemented: true,
  },
  {
    id: 'warroom',
    name: '작전실',
    description: '전투에 내보낼 파티를 편성합니다.',
    x: 1030,
    y: 320,
    hitWidth: 290,
    hitHeight: 150,
    labelOffsetY: -80,
    implemented: true,
  },
  {
    id: 'shop',
    name: '상점',
    description: '아이템과 액션 카드를 구매합니다.',
    x: 170,
    y: 550,
    hitWidth: 220,
    hitHeight: 140,
    labelOffsetY: -70,
    implemented: false,
  },
  {
    id: 'settings',
    name: '설정',
    description: '게임 설정을 변경합니다.',
    x: 1100,
    y: 525,
    hitWidth: 220,
    hitHeight: 145,
    labelOffsetY: -68,
    implemented: false,
  },
  {
    id: 'sortie',
    name: '출격',
    description: '전장을 선택하고 출격합니다.',
    x: CX - 5,
    y: 490,
    hitWidth: 260,
    hitHeight: 170,
    labelOffsetY: -95,
    implemented: true,
  },
];

export class TownScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private overlayDim?: Phaser.GameObjects.Rectangle;
  private overlayPanel?: UIPanel;
  private overlayButtons: UIButton[] = [];
  private overlayTexts: Phaser.GameObjects.Text[] = [];
  private selectedBarracksCharacterId?: string;

  constructor() {
    super({ key: 'TownScene' });
  }

  create(): void {
    this.drawBackground();
    this.drawTopBar();
    this.createBuildings();
  }

  /** 배경 이미지 표시 */
  private drawBackground(): void {
    const bg = this.add.image(CX, GAME_HEIGHT / 2, 'town-bg');
    // 이미지를 게임 해상도에 맞춰 스케일링
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
  }

  /** 상단 정보 바 */
  private drawTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.75);
    bar.fillRect(0, 0, GAME_WIDTH, 44);
    bar.lineStyle(1, 0x3a3a5a, 0.5);
    bar.lineBetween(0, 44, GAME_WIDTH, 44);
    bar.setDepth(10);

    this.add
      .text(20, 12, '마을', {
        ...UITheme.font.heading,
        color: UITheme.colors.textPrimary,
      })
      .setDepth(11);

    const heroInfo = formatTownHeaderHeroInfo(gameState.formation.heroType);

    this.add
      .text(GAME_WIDTH - 240, 8, heroInfo.title, {
        fontSize: '13px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#9dd6ff',
      })
      .setOrigin(1, 0)
      .setDepth(11);

    this.add
      .text(GAME_WIDTH - 240, 24, heroInfo.subtitle, {
        fontSize: '10px',
        fontFamily: UITheme.font.family,
        color: '#7f8fa6',
      })
      .setOrigin(1, 0)
      .setDepth(11);

    this.goldText = this.add
      .text(GAME_WIDTH - 20, 12, `Gold: ${gameState.gold}`, {
        ...UITheme.font.body,
        color: '#ffcc00',
      })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  /** 건물 히트박스 전체 생성 */
  private createBuildings(): void {
    for (const bld of BUILDINGS) {
      this.createBuilding(bld);
    }
  }

  /** 개별 건물 히트박스 생성 */
  private createBuilding(def: BuildingDef): void {
    const container = this.add.container(def.x, def.y);
    container.setDepth(5);

    // 투명 히트박스
    const hitArea = this.add
      .rectangle(0, 0, def.hitWidth, def.hitHeight, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    // hover 시 표시되는 밝기 오버레이
    const hoverOverlay = this.add.graphics();
    hoverOverlay.setAlpha(0);
    container.add(hoverOverlay);
    hoverOverlay.fillStyle(0xffffff, 0.12);
    hoverOverlay.fillRoundedRect(-def.hitWidth / 2, -def.hitHeight / 2, def.hitWidth, def.hitHeight, 8);
    hoverOverlay.lineStyle(2, 0xf5d78e, 0.6);
    hoverOverlay.strokeRoundedRect(-def.hitWidth / 2, -def.hitHeight / 2, def.hitWidth, def.hitHeight, 8);

    // 건물 이름 라벨 (hover 시 표시)
    const nameLabel = this.add
      .text(0, def.labelOffsetY, def.name, {
        ...UITheme.font.body,
        color: '#ffe8a0',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    container.add(nameLabel);

    // Hover 효과
    hitArea.on('pointerover', () => {
      this.tweens.add({
        targets: [hoverOverlay, nameLabel],
        alpha: 1,
        duration: 150,
        ease: 'Power1',
      });
    });

    hitArea.on('pointerout', () => {
      this.tweens.add({
        targets: [hoverOverlay, nameLabel],
        alpha: 0,
        duration: 150,
        ease: 'Power1',
      });
    });

    // 클릭
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

    // 출격 게이트: 미세 breathing
    if (def.id === 'sortie') {
      this.tweens.add({
        targets: container,
        scaleX: 1.02,
        scaleY: 1.02,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
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
      case 'barracks':
        this.openBarracksPanel();
        break;
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

  private openBarracksPanel(): void {
    const characters = gameState.characters;
    if (characters.length === 0) {
      new UIModal(this, {
        title: '병영',
        content: '보유 중인 캐릭터가 없습니다.',
      });
      return;
    }

    this.destroyOverlay();

    const panelWidth = 900;
    const panelHeight = 520;
    const panelX = (GAME_WIDTH - panelWidth) / 2;
    const panelY = (GAME_HEIGHT - panelHeight) / 2;
    const rosterSummary = getBarracksRosterSummary(characters.length, gameState.maxCharacterSlots);
    const selectedId = this.selectedBarracksCharacterId ?? characters[0].id;
    const selectedCharacter = characters.find((character) => character.id === selectedId) ?? characters[0];

    this.overlayDim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setInteractive()
      .setDepth(100);
    this.overlayDim.on('pointerdown', () => this.destroyOverlay());

    this.overlayPanel = new UIPanel(this, {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      title: '병영',
      borderColor: UITheme.colors.borderLight,
    });
    this.overlayPanel.setDepth(101);

    const listWidth = 250;
    const detailX = UITheme.panel.padding + listWidth + 24;
    const contentTop = this.overlayPanel.contentY;

    const rosterText = this.add.text(UITheme.panel.padding, contentTop, rosterSummary.countLabel, {
      ...UITheme.font.small,
      color: UITheme.colors.textAccent,
    });
    this.overlayPanel.add(rosterText);
    this.overlayTexts.push(rosterText);

    const divider = this.add.graphics();
    divider.lineStyle(1, UITheme.colors.borderLight, 0.9);
    divider.lineBetween(detailX - 14, contentTop, detailX - 14, panelHeight - 78);
    this.overlayPanel.add(divider);

    characters.forEach((character, index) => {
      const isSelected = character.id === selectedCharacter.id;
      const btn = new UIButton(this, {
        x: UITheme.panel.padding,
        y: contentTop + 34 + index * 52,
        width: listWidth,
        height: 42,
        label: `${character.name} (${character.characterClass})`,
        style: isSelected ? 'primary' : 'secondary',
        onClick: () => {
          this.selectedBarracksCharacterId = character.id;
          this.openBarracksPanel();
        },
      });
      this.overlayPanel!.add(btn.container);
      this.overlayButtons.push(btn);
    });

    this.renderBarracksDetail(selectedCharacter, detailX, contentTop);

    const closeBtn = new UIButton(this, {
      x: panelWidth - 156,
      y: panelHeight - 58,
      width: 132,
      height: 40,
      label: '닫기',
      style: 'secondary',
      onClick: () => this.destroyOverlay(),
    });
    this.overlayPanel.add(closeBtn.container);
    this.overlayButtons.push(closeBtn);
  }

  private renderBarracksDetail(character: CharacterDefinition, x: number, top: number): void {
    if (!this.overlayPanel) return;

    const detail = getCharacterDetailViewModel(character);
    const titleText = this.add.text(x, top, detail.title, {
      ...UITheme.font.heading,
      color: UITheme.colors.textPrimary,
    });
    this.overlayPanel.add(titleText);
    this.overlayTexts.push(titleText);

    const classText = this.add.text(x, top + 42, detail.classLabel, {
      ...UITheme.font.body,
      color: '#9dd6ff',
    });
    this.overlayPanel.add(classText);
    this.overlayTexts.push(classText);

    const trainingText = this.add.text(x, top + 72, detail.trainingLabel, {
      ...UITheme.font.small,
      color: UITheme.colors.textSecondary,
    });
    this.overlayPanel.add(trainingText);
    this.overlayTexts.push(trainingText);

    const statsText = this.add.text(x, top + 112, detail.statsLabel, {
      ...UITheme.font.body,
      color: UITheme.colors.textPrimary,
      wordWrap: { width: 560 },
    });
    this.overlayPanel.add(statsText);
    this.overlayTexts.push(statsText);

    const actionHeader = this.add.text(x, top + 168, 'Action Slots', {
      ...UITheme.font.body,
      color: UITheme.colors.textGold,
    });
    this.overlayPanel.add(actionHeader);
    this.overlayTexts.push(actionHeader);

    detail.actionsLabel.forEach((actionLabel, index) => {
      const actionText = this.add.text(x, top + 204 + index * 34, actionLabel, {
        ...UITheme.font.body,
        color: UITheme.colors.textPrimary,
        wordWrap: { width: 560 },
      });
      this.overlayPanel!.add(actionText);
      this.overlayTexts.push(actionText);
    });
  }

  private destroyOverlay(): void {
    this.overlayTexts.forEach((text) => text.destroy());
    this.overlayTexts = [];

    this.overlayButtons.forEach((button) => button.destroy());
    this.overlayButtons = [];

    this.overlayPanel?.destroy();
    this.overlayPanel = undefined;

    this.overlayDim?.destroy();
    this.overlayDim = undefined;
  }
}
