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
import { UIActionMiniCard } from '../ui/UIActionMiniCard';
import { UIToast } from '../ui/UIToast';
import { shouldCloseModalFromBackdrop } from '../ui/ModalHitTest';
import { gameState } from '../core/GameState';
import { formatTownHeaderHeroInfo } from '../systems/TownHeader';
import {
  getBarracksDismissViewModel,
  getBarracksRosterSummary,
  getCharacterDetailViewModel,
} from '../systems/BarracksDetail';
import { getBarracksDismissState } from '../systems/BarracksDismissal';
import { getRecruitPurchaseFailureMessage } from '../systems/RecruitShop';
import { applyTrainingToCharacter, getTrainingCharacterViewModel } from '../systems/TrainingGround';
import type { CharacterDefinition, TrainableStat } from '../types';

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
    implemented: true,
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
    description: '골드로 신규 멤버를 영입합니다.',
    x: 170,
    y: 550,
    hitWidth: 220,
    hitHeight: 140,
    labelOffsetY: -70,
    implemented: true,
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
  private toast!: UIToast;
  private overlayDim?: Phaser.GameObjects.Rectangle;
  private overlayPanel?: UIPanel;
  private overlayButtons: UIButton[] = [];
  private overlayTexts: Phaser.GameObjects.Text[] = [];
  private overlayActionCards: UIActionMiniCard[] = [];
  private recruitTooltip?: Phaser.GameObjects.Container;
  private recruitTooltipCards: UIActionMiniCard[] = [];
  private selectedBarracksCharacterId?: string;
  private selectedTrainingCharacterId?: string;

  constructor() {
    super({ key: 'TownScene' });
  }

  create(): void {
    this.drawBackground();
    this.drawTopBar();
    this.toast = new UIToast(this, { y: GAME_HEIGHT - 90, duration: 1800 });
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
      case 'training':
        this.openTrainingPanel();
        break;
      case 'barracks':
        this.openBarracksPanel();
        break;
      case 'sortie':
        this.scene.start('SortieScene');
        break;
      case 'warroom':
        this.scene.start('FormationScene');
        break;
      case 'shop':
        this.openRecruitShopPanel();
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

    this.createOverlayBackdrop(panelX, panelY, panelWidth, panelHeight);

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
    const dismissState = getBarracksDismissState({
      hasActiveRun: !!gameState.runState,
      rosterCount: gameState.characters.length,
      targetExists: true,
    });
    const dismissViewModel = getBarracksDismissViewModel(dismissState);
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

    detail.actionSlots.forEach((slot, index) => {
      const card = new UIActionMiniCard(this, {
        x,
        y: top + 204 + index * 62,
        width: 560,
        height: 56,
        action: slot.action,
        condition: slot.condition,
        rarity: slot.action.rarity,
        classRestriction: slot.action.classRestriction,
      });
      this.overlayPanel!.add(card.container);
      this.overlayActionCards.push(card);
    });

    if (dismissViewModel.helperLabel) {
      const helperText = this.add.text(x, top + 400, dismissViewModel.helperLabel, {
        ...UITheme.font.small,
        color: UITheme.colors.textSecondary,
        wordWrap: { width: 560 },
      });
      this.overlayPanel.add(helperText);
      this.overlayTexts.push(helperText);
    }

    const dismissButton = new UIButton(this, {
      x,
      y: top + 438,
      width: 180,
      height: 40,
      label: dismissViewModel.buttonLabel,
      style: 'secondary',
      disabled: dismissViewModel.disabled,
      onClick: () => this.confirmBarracksDismiss(character),
    }).setPaletteOverride({
      border: 0xc76666,
      text: dismissViewModel.disabled ? undefined : '#ffd0d0',
    });
    this.overlayPanel.add(dismissButton.container);
    this.overlayButtons.push(dismissButton);
  }

  private confirmBarracksDismiss(character: CharacterDefinition): void {
    new UIModal(this, {
      title: '멤버 방출',
      content: `${character.name}을(를) 로스터에서 방출합니다. 이 작업은 되돌릴 수 없습니다.`,
      buttonLabel: '방출',
      secondaryButtonLabel: '취소',
      onClose: () => {
        const result = gameState.dismissCharacter(character.id);
        if (!result.ok) {
          this.toast.show(
            result.reason === 'run-active'
              ? '런 진행 중에는 방출할 수 없습니다'
              : result.reason === 'minimum-roster'
                ? '최소 4명의 멤버는 유지해야 합니다'
                : '대상 멤버를 찾을 수 없습니다',
          );
          return;
        }

        const nextCharacters = gameState.characters;
        this.selectedBarracksCharacterId = nextCharacters[0]?.id;
        this.openBarracksPanel();
        this.toast.show(`${character.name} 방출`);
      },
    });
  }

  private destroyOverlay(): void {
    this.overlayTexts.forEach((text) => text.destroy());
    this.overlayTexts = [];

    this.overlayButtons.forEach((button) => button.destroy());
    this.overlayButtons = [];

    this.overlayActionCards.forEach((card) => card.destroy());
    this.overlayActionCards = [];
    this.destroyRecruitTooltip();

    this.overlayPanel?.destroy();
    this.overlayPanel = undefined;

    this.overlayDim?.destroy();
    this.overlayDim = undefined;
  }

  private openTrainingPanel(): void {
    const characters = gameState.characters;
    if (characters.length === 0) {
      new UIModal(this, {
        title: '훈련소',
        content: '훈련할 캐릭터가 없습니다.',
      });
      return;
    }

    this.destroyOverlay();

    const panelWidth = 900;
    const panelHeight = 520;
    const panelX = (GAME_WIDTH - panelWidth) / 2;
    const panelY = (GAME_HEIGHT - panelHeight) / 2;
    const selectedId = this.selectedTrainingCharacterId ?? characters[0].id;
    const selectedCharacter = characters.find((character) => character.id === selectedId) ?? characters[0];
    const viewModel = getTrainingCharacterViewModel(selectedCharacter, gameState.gold);

    this.createOverlayBackdrop(panelX, panelY, panelWidth, panelHeight);

    this.overlayPanel = new UIPanel(this, {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      title: '훈련소',
      borderColor: UITheme.colors.borderLight,
    });
    this.overlayPanel.setDepth(101);

    const listWidth = 250;
    const detailX = UITheme.panel.padding + listWidth + 24;
    const contentTop = this.overlayPanel.contentY;

    const goldText = this.add.text(UITheme.panel.padding, contentTop, `Gold: ${gameState.gold}`, {
      ...UITheme.font.small,
      color: UITheme.colors.textGold,
    });
    this.overlayPanel.add(goldText);
    this.overlayTexts.push(goldText);

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
          this.selectedTrainingCharacterId = character.id;
          this.openTrainingPanel();
        },
      });
      this.overlayPanel!.add(btn.container);
      this.overlayButtons.push(btn);
    });

    this.renderTrainingDetail(selectedCharacter, viewModel, detailX, contentTop);

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

  private renderTrainingDetail(
    character: CharacterDefinition,
    viewModel: ReturnType<typeof getTrainingCharacterViewModel>,
    x: number,
    top: number,
  ): void {
    if (!this.overlayPanel) return;

    const titleText = this.add.text(x, top, viewModel.title, {
      ...UITheme.font.heading,
      color: UITheme.colors.textPrimary,
    });
    this.overlayPanel.add(titleText);
    this.overlayTexts.push(titleText);

    const classText = this.add.text(x, top + 42, `Class: ${character.characterClass}`, {
      ...UITheme.font.body,
      color: '#9dd6ff',
    });
    this.overlayPanel.add(classText);
    this.overlayTexts.push(classText);

    const trainingText = this.add.text(x, top + 76, viewModel.trainingLabel, {
      ...UITheme.font.small,
      color: UITheme.colors.textSecondary,
    });
    this.overlayPanel.add(trainingText);
    this.overlayTexts.push(trainingText);

    const costText = this.add.text(x, top + 106, viewModel.costLabel, {
      ...UITheme.font.body,
      color: UITheme.colors.textGold,
    });
    this.overlayPanel.add(costText);
    this.overlayTexts.push(costText);

    const statusText = this.add.text(x, top + 138, viewModel.statusLabel, {
      ...UITheme.font.body,
      color: viewModel.statusLabel === '훈련 가능' ? UITheme.colors.textAccent : UITheme.colors.textWarning,
    });
    this.overlayPanel.add(statusText);
    this.overlayTexts.push(statusText);

    const statText = this.add.text(
      x,
      top + 186,
      `HP ${character.baseStats.hp}  ATK ${character.baseStats.atk}  GRD ${character.baseStats.grd}  AGI ${character.baseStats.agi}`,
      {
        ...UITheme.font.body,
        color: UITheme.colors.textPrimary,
      },
    );
    this.overlayPanel.add(statText);
    this.overlayTexts.push(statText);

    viewModel.options.forEach((option, index) => {
      const btn = new UIButton(this, {
        x: x + (index % 2) * 180,
        y: top + 240 + Math.floor(index / 2) * 58,
        width: 160,
        height: 42,
        label: option.label,
        style: 'primary',
        disabled: option.disabled,
        onClick: () => this.applyTraining(character, option.stat),
      });
      this.overlayPanel!.add(btn.container);
      this.overlayButtons.push(btn);
    });
  }

  private applyTraining(character: CharacterDefinition, stat: TrainableStat): void {
    const result = applyTrainingToCharacter(character, gameState.gold, stat);
    if ('error' in result) {
      this.goldText.setText(`Gold: ${gameState.gold}`);
      new UIModal(this, {
        title: '훈련소',
        content: result.error,
      });
      return;
    }

    gameState.updateCharacter(result.character);
    gameState.setGold(result.remainingGold);
    this.goldText.setText(`Gold: ${gameState.gold}`);
    this.selectedTrainingCharacterId = result.character.id;
    this.openTrainingPanel();
  }

  private openRecruitShopPanel(): void {
    this.destroyOverlay();

    const panelWidth = 900;
    const panelHeight = 500;
    const panelX = (GAME_WIDTH - panelWidth) / 2;
    const panelY = (GAME_HEIGHT - panelHeight) / 2;
    const shopState = gameState.recruitShopState;
    const rosterFull = gameState.characters.length >= gameState.maxCharacterSlots;
    const canRefresh = gameState.gold >= shopState.refreshCost && !rosterFull;

    this.createOverlayBackdrop(panelX, panelY, panelWidth, panelHeight);

    this.overlayPanel = new UIPanel(this, {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
      title: '상점',
      borderColor: UITheme.colors.borderLight,
    });
    this.overlayPanel.setDepth(101);
    const contentTop = this.overlayPanel.contentY;

    const goldText = this.add.text(UITheme.panel.padding, contentTop, `Gold: ${gameState.gold}`, {
      ...UITheme.font.body,
      color: UITheme.colors.textGold,
    });
    this.overlayPanel.add(goldText);
    this.overlayTexts.push(goldText);

    const refreshText = this.add.text(
      panelWidth - UITheme.panel.padding,
      contentTop,
      `Refresh ${shopState.refreshCost}G`,
      {
        ...UITheme.font.small,
        color: canRefresh ? UITheme.colors.textAccent : UITheme.colors.textSecondary,
      },
    );
    refreshText.setOrigin(1, 0);
    this.overlayPanel.add(refreshText);
    this.overlayTexts.push(refreshText);

    const startX = UITheme.panel.padding;
    const cardWidth = 252;
    const cardHeight = 286;
    const gap = 18;

    shopState.offers.forEach((offer, index) => {
      const x = startX + index * (cardWidth + gap);
      const y = contentTop + 72;
      const card = this.add.graphics();
      card.fillStyle(UITheme.colors.bgPanelLight, 0.98);
      card.lineStyle(2, offer.character ? UITheme.colors.borderLight : UITheme.colors.border, 1);
      card.fillRoundedRect(x, y, cardWidth, cardHeight, 12);
      card.strokeRoundedRect(x, y, cardWidth, cardHeight, 12);
      this.overlayPanel!.add(card);

      if (!offer.character) {
        const emptyText = this.add.text(x + cardWidth / 2, y + 84, '영입 완료', {
          ...UITheme.font.heading,
          color: UITheme.colors.textSecondary,
        });
        emptyText.setOrigin(0.5);
        this.overlayPanel!.add(emptyText);
        this.overlayTexts.push(emptyText);
        return;
      }

      const title = this.add.text(x + 16, y + 16, offer.character.name, {
        ...UITheme.font.heading,
        color: UITheme.colors.textPrimary,
      });
      this.overlayPanel!.add(title);
      this.overlayTexts.push(title);

      const classText = this.add.text(x + 16, y + 50, offer.character.characterClass, {
        ...UITheme.font.small,
        color: '#9dd6ff',
      });
      this.overlayPanel!.add(classText);
      this.overlayTexts.push(classText);

      const statsText = this.add.text(
        x + 16,
        y + 84,
        `HP ${offer.character.baseStats.hp}  ATK ${offer.character.baseStats.atk}\nGRD ${offer.character.baseStats.grd}  AGI ${offer.character.baseStats.agi}`,
        {
          ...UITheme.font.body,
          color: UITheme.colors.textPrimary,
          lineSpacing: 8,
        },
      );
      this.overlayPanel!.add(statsText);
      this.overlayTexts.push(statsText);

      const priceText = this.add.text(x + 16, y + 156, `${offer.price} Gold`, {
        ...UITheme.font.body,
        color: UITheme.colors.textGold,
      });
      priceText.setY(y + 182);
      this.overlayPanel!.add(priceText);
      this.overlayTexts.push(priceText);

      const hintText = this.add.text(x + 16, y + 214, '카드 위로 마우스를 올려 전술 보기', {
        ...UITheme.font.small,
        color: UITheme.colors.textSecondary,
      });
      this.overlayPanel!.add(hintText);
      this.overlayTexts.push(hintText);

      const hoverArea = this.add
        .rectangle(x + cardWidth / 2, y + cardHeight / 2, cardWidth, cardHeight, 0x000000, 0)
        .setInteractive({ useHandCursor: true });
      hoverArea.on('pointerover', () =>
        this.showRecruitTooltip(offer.character!, x, y, cardWidth, panelWidth, contentTop),
      );
      hoverArea.on('pointerout', () => this.destroyRecruitTooltip());
      this.overlayPanel!.add(hoverArea);

      const recruitDisabled = gameState.gold < offer.price || rosterFull;
      const recruitBtn = new UIButton(this, {
        x: x + 16,
        y: y + 240,
        width: cardWidth - 32,
        height: 34,
        label: '영입',
        style: 'primary',
        disabled: recruitDisabled,
        onClick: () => this.recruitFromShop(offer.slotIndex),
      });
      this.overlayPanel!.add(recruitBtn.container);
      this.overlayButtons.push(recruitBtn);
    });

    if (rosterFull) {
      const fullText = this.add.text(UITheme.panel.padding, panelHeight - 102, '로스터가 가득 찼습니다.', {
        ...UITheme.font.small,
        color: UITheme.colors.textWarning,
      });
      this.overlayPanel.add(fullText);
      this.overlayTexts.push(fullText);
    }

    const refreshBtn = new UIButton(this, {
      x: panelWidth - 308,
      y: panelHeight - 58,
      width: 132,
      height: 40,
      label: 'REFRESH',
      style: 'secondary',
      disabled: !canRefresh,
      onClick: () => {
        if (!gameState.refreshRecruitShop()) {
          new UIModal(this, {
            title: '상점',
            content: rosterFull ? '로스터가 가득 차 있어 새 후보를 볼 필요가 없습니다.' : '골드가 부족합니다.',
          });
          return;
        }
        this.goldText.setText(`Gold: ${gameState.gold}`);
        this.openRecruitShopPanel();
      },
    });
    this.overlayPanel.add(refreshBtn.container);
    this.overlayButtons.push(refreshBtn);

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

  private recruitFromShop(slotIndex: number): void {
    const result = gameState.recruitFromShop(slotIndex);
    if (!result.ok) {
      new UIModal(this, {
        title: '상점',
        content: getRecruitPurchaseFailureMessage(result.reason),
      });
      return;
    }

    this.goldText.setText(`Gold: ${gameState.gold}`);
    this.openRecruitShopPanel();
  }

  private showRecruitTooltip(
    character: CharacterDefinition,
    cardX: number,
    cardY: number,
    cardWidth: number,
    panelWidth: number,
    contentTop: number,
  ): void {
    if (!this.overlayPanel) return;

    this.destroyRecruitTooltip();

    const tooltipWidth = 276;
    const tooltipPadding = 12;
    const tooltipGap = 8;
    let tooltipHeight = 38 + tooltipPadding;
    const tooltipX = Phaser.Math.Clamp(
      cardX + cardWidth / 2 - tooltipWidth / 2,
      UITheme.panel.padding,
      panelWidth - tooltipWidth - UITheme.panel.padding,
    );
    character.baseActionSlots.forEach((slot) => {
      const miniCard = new UIActionMiniCard(this, {
        x: 12,
        y: tooltipHeight - tooltipPadding,
        width: tooltipWidth - 24,
        height: 68,
        density: 'compact',
        autoHeight: false,
        showTooltip: false,
        action: slot.action,
        condition: slot.condition,
        rarity: slot.action.rarity,
        classRestriction: slot.action.classRestriction,
      });
      this.recruitTooltipCards.push(miniCard);
      tooltipHeight += miniCard.height + tooltipGap;
    });

    tooltipHeight -= tooltipGap;

    const tooltipY = Math.max(contentTop + 34, cardY - tooltipHeight - 12);

    const tooltip = this.add.container(tooltipX, tooltipY);
    const bg = this.add.graphics();
    bg.fillStyle(0x101628, 0.98);
    bg.fillRoundedRect(0, 0, tooltipWidth, tooltipHeight, 10);
    bg.lineStyle(2, UITheme.colors.borderHighlight, 0.95);
    bg.strokeRoundedRect(0, 0, tooltipWidth, tooltipHeight, 10);
    tooltip.add(bg);

    const title = this.add.text(12, 10, `${character.name} 전술`, {
      ...UITheme.font.body,
      color: UITheme.colors.textGold,
    });
    tooltip.add(title);

    this.recruitTooltipCards.forEach((miniCard) => {
      tooltip.add(miniCard.container);
    });

    this.overlayPanel.add(tooltip);
    this.recruitTooltip = tooltip;
  }

  private destroyRecruitTooltip(): void {
    this.recruitTooltipCards.forEach((card) => card.destroy());
    this.recruitTooltipCards = [];
    this.recruitTooltip?.destroy();
    this.recruitTooltip = undefined;
  }

  private createOverlayBackdrop(panelX: number, panelY: number, panelWidth: number, panelHeight: number): void {
    const panelBounds = { x: panelX, y: panelY, width: panelWidth, height: panelHeight };
    this.overlayDim = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65)
      .setInteractive()
      .setDepth(100);
    this.overlayDim.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (shouldCloseModalFromBackdrop({ x: pointer.x, y: pointer.y }, panelBounds)) {
        this.destroyOverlay();
      }
    });
  }
}
