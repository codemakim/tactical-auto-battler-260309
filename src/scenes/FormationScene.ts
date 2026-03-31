/**
 * FormationScene — 편성 화면
 *
 * 메인 레이아웃:
 * - 좌측: ROSTER
 * - 중앙: TACTICAL BOARD
 * - 하단: COMMAND / PRESETS / TACTICS / DEPLOY
 *
 * 상세 정보와 영웅 선택은 메인 화면에 상시 노출하지 않고
 * 오버레이와 보드 HUD로 분리한다.
 */
import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from '../ui/UITheme';
import { UIPanel } from '../ui/UIPanel';
import { UIToast } from '../ui/UIToast';
import { UIButton } from '../ui/UIButton';
import { UIModal } from '../ui/UIModal';
import { gameState } from '../core/GameState';
import { Position, RunStatus } from '../types';
import type { CardInstance, CharacterDefinition, RunState, SlotDisplayData } from '../types';
import { HERO_DEFINITIONS } from '../data/HeroDefinitions';
import { getSlotDisplayData, swapBaseActionSlots, swapRunActionSlots } from '../systems/FormationCardCalculator';
import { equipCard, unequipCard } from '../core/RunManager';
import type { FormationFlowContext, FormationSceneData } from '../systems/FormationFlow';
import {
  getFormationActionButtonConfig,
  getFormationBackButtonConfig,
  getFormationTopBarTitle,
  resolveFormationFlowContext,
} from '../systems/FormationFlow';
import { calculateRowLayout } from '../systems/UnitLayoutCalculator';
import { canAddToZone, validateFormation } from '../systems/FormationValidator';
import { getFormationLanePresentation, getFormationPanelLabels } from '../systems/FormationPresentation';
import {
  FORMATION_LAYOUT,
  FORMATION_SPRITE_MAP,
  getFormationZones,
  type ZoneDef,
} from '../systems/FormationSceneLayout';
import { getRosterItemVisualState, getUnitCardVisualState } from '../systems/FormationSceneStyles';
import { drawHorizontalDivider, drawRoundedFrame } from '../ui/FormationGraphics';
import { FormationSceneOverlays } from '../systems/FormationSceneOverlays';

const ZONES = getFormationZones();

export class FormationScene extends Phaser.Scene {
  private rosterPanel!: UIPanel;
  private rosterItems: Phaser.GameObjects.Container[] = [];
  private selectedActionSlot: number | null = null;
  private selectedRosterCharId: string | null = null;
  private toast!: UIToast;
  private currentHeroText!: Phaser.GameObjects.Text;
  private selectedUnitTitle!: Phaser.GameObjects.Text;
  private selectedUnitMeta!: Phaser.GameObjects.Text;
  private selectedUnitTactics!: Phaser.GameObjects.Text;
  private overlays!: FormationSceneOverlays;

  private zoneContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  private zoneUnitVisuals: Phaser.GameObjects.Container[] = [];

  private isRetry = false;
  private flowContext: FormationFlowContext = 'TOWN';
  private defeatedByEnemies: Array<{ name: string; characterClass: string; hp: number; maxHp: number }> = [];

  constructor() {
    super({ key: 'FormationScene' });
  }

  create(data?: FormationSceneData): void {
    this.selectedRosterCharId = null;
    this.selectedActionSlot = null;
    this.rosterItems = [];
    this.zoneContainers = new Map();
    this.zoneUnitVisuals = [];
    this.isRetry = data?.isRetry ?? false;
    this.defeatedByEnemies = data?.defeatedByEnemies ?? [];
    this.flowContext = resolveFormationFlowContext({
      runState: gameState.runState,
      isRetry: this.isRetry,
      returnScene: data?.returnScene,
    });

    this.drawBackground();
    this.drawTopBar();
    if (this.isRetry) this.drawRetryBanner();
    this.createRosterPanel();
    this.createZones();
    this.createBoardHud();
    this.createBottomButtons();
    this.toast = new UIToast(this, { y: GAME_HEIGHT - 110, duration: 2500 });
    this.overlays = new FormationSceneOverlays(this, {
      getSelectedActionSlot: () => this.selectedActionSlot,
      showToast: (message) => this.toast.show(message),
      refreshAll: () => this.refreshAll(),
      refreshCommandHud: () => this.refreshCommandHud(),
      onActionSlotClick: (char, slot) => this.onActionSlotClick(char, slot),
      onSwapSlots: (char, indexA, indexB) => this.onSwapSlots(char, indexA, indexB),
      onInventoryCardClick: (char, card) => this.onInventoryCardClick(char, card),
    });
    this.refreshAll();
  }

  private drawBackground(): void {
    const gfx = this.add.graphics();
    gfx.fillStyle(0x0f0f1a, 1);
    gfx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawRoundedFrame(
      gfx,
      FORMATION_LAYOUT.boardFrame.x,
      FORMATION_LAYOUT.boardFrame.y,
      FORMATION_LAYOUT.boardFrame.width,
      FORMATION_LAYOUT.boardFrame.height,
      FORMATION_LAYOUT.boardFrame.radius,
      { backgroundColor: 0x14172a, borderColor: 0x324768, borderWidth: 2, alpha: 0.88 },
    );

    gfx.fillStyle(0x192033, 0.92);
    gfx.fillRoundedRect(
      FORMATION_LAYOUT.boardInner.x,
      FORMATION_LAYOUT.boardInner.y,
      FORMATION_LAYOUT.boardInner.width,
      FORMATION_LAYOUT.boardInner.height,
      FORMATION_LAYOUT.boardInner.radius,
    );

    gfx.lineStyle(1, 0x22324f, 0.75);
    for (let i = 0; i < FORMATION_LAYOUT.boardGrid.columns; i++) {
      const x = FORMATION_LAYOUT.boardGrid.startX + i * FORMATION_LAYOUT.boardGrid.gap;
      gfx.lineBetween(x, FORMATION_LAYOUT.boardGrid.startY, x, FORMATION_LAYOUT.boardGrid.endY);
    }
    gfx.lineBetween(
      FORMATION_LAYOUT.boardGrid.midlineStartX,
      FORMATION_LAYOUT.boardGrid.midlineY,
      FORMATION_LAYOUT.boardGrid.midlineEndX,
      FORMATION_LAYOUT.boardGrid.midlineY,
    );
  }

  private drawTopBar(): void {
    const bar = this.add.graphics();
    bar.fillStyle(0x0a0a16, 0.85);
    bar.fillRect(0, 0, GAME_WIDTH, 50);
    bar.lineStyle(1, UITheme.colors.border);
    bar.lineBetween(0, 50, GAME_WIDTH, 50);
    bar.setDepth(10);

    const title = getFormationTopBarTitle(this.flowContext);
    const titleColor = this.isRetry
      ? '#ffaa44'
      : this.flowContext === 'RUN_EDIT'
        ? '#ffcc66'
        : UITheme.colors.textPrimary;
    this.add.text(20, 14, title, { ...UITheme.font.heading, color: titleColor }).setDepth(11);

    this.add
      .text(GAME_WIDTH - 20, 14, `Gold: ${gameState.gold}`, { ...UITheme.font.body, color: '#ffcc00' })
      .setOrigin(1, 0)
      .setDepth(11);
  }

  private drawRetryBanner(): void {
    const bannerY = 52;
    const bannerH = this.defeatedByEnemies.length > 0 ? 56 : 32;
    const bg = this.add.graphics().setDepth(10);
    bg.fillStyle(0x3a2200, 0.9);
    bg.fillRect(0, bannerY, GAME_WIDTH, bannerH);
    bg.lineStyle(1, 0xffaa44, 0.6);
    bg.lineBetween(0, bannerY + bannerH, GAME_WIDTH, bannerY + bannerH);

    const msg = this.add
      .text(GAME_WIDTH / 2, bannerY + 8, '패배 후 재도전 — 편성을 수정하고 다시 싸우세요! (마지막 기회)', {
        fontSize: '13px',
        fontFamily: UITheme.font.family,
        fontStyle: 'bold',
        color: '#ffcc00',
      })
      .setOrigin(0.5, 0)
      .setDepth(11);

    if (this.defeatedByEnemies.length > 0) {
      const enemyInfo = this.defeatedByEnemies.map((e) => `${e.name}(${e.hp}/${e.maxHp})`).join('  ');
      this.add
        .text(GAME_WIDTH / 2, bannerY + 28, `남은 적: ${enemyInfo}`, {
          fontSize: '11px',
          fontFamily: UITheme.font.family,
          color: '#ff8866',
        })
        .setOrigin(0.5, 0)
        .setDepth(11);
    }

    this.tweens.add({
      targets: msg,
      alpha: { from: 1, to: 0.6 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  private createRosterPanel(): void {
    const labels = getFormationPanelLabels();
    this.rosterPanel = new UIPanel(this, {
      x: FORMATION_LAYOUT.rosterPanel.x,
      y: FORMATION_LAYOUT.rosterPanel.y,
      width: FORMATION_LAYOUT.rosterPanel.width,
      height: GAME_HEIGHT - 130,
      title: labels.roster,
      bgColor: 0x171a2b,
      borderColor: 0x3b4f74,
      bgAlpha: 0.98,
    });
  }

  private refreshRoster(): void {
    for (const item of this.rosterItems) item.destroy();
    this.rosterItems = [];

    const characters = gameState.characters;
    const formationIds = new Set(gameState.getFormationCharacterIds());
    const startY = this.rosterPanel.contentY + FORMATION_LAYOUT.rosterItem.startY;
    const itemH = FORMATION_LAYOUT.rosterItem.rowGap;

    for (let i = 0; i < characters.length; i++) {
      const char = characters[i];
      const isAssigned = formationIds.has(char.id);
      const isSelected = char.id === this.selectedRosterCharId;
      const item = this.createRosterItem(
        char,
        isAssigned,
        isSelected,
        FORMATION_LAYOUT.rosterItem.startX,
        startY + i * itemH,
      );
      this.rosterPanel.add(item);
      this.rosterItems.push(item);
    }
  }

  private createRosterItem(
    char: CharacterDefinition,
    isAssigned: boolean,
    isSelected: boolean,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = FORMATION_LAYOUT.rosterItem.width;
    const h = FORMATION_LAYOUT.rosterItem.height;

    const bg = this.add.graphics();
    const baseState = getRosterItemVisualState({ isSelected, isAssigned });
    drawRoundedFrame(bg, 0, 0, w, h, FORMATION_LAYOUT.rosterItem.radius, baseState);
    container.add(bg);

    const classShort = char.characterClass.substring(0, 3);
    container.add(this.add.text(8, 6, classShort, { ...UITheme.font.small, color: '#6688aa' }).setFontSize(11));

    container.add(
      this.add.text(8, 22, char.name, {
        ...UITheme.font.label,
        color: isAssigned ? UITheme.colors.textAccent : UITheme.colors.textPrimary,
      }),
    );

    const stats = char.baseStats;
    container.add(
      this.add
        .text(w - 8, 14, `HP${stats.hp} A${stats.atk} G${stats.grd} S${stats.agi}`, {
          ...UITheme.font.small,
          color: '#666688',
        })
        .setOrigin(1, 0)
        .setFontSize(10),
    );

    if (isAssigned) {
      container.add(
        this.add
          .text(w - 8, 32, '편성됨', { ...UITheme.font.small, color: '#4488cc' })
          .setOrigin(1, 0)
          .setFontSize(10),
      );
    }

    const hitArea = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      drawRoundedFrame(bg, 0, 0, w, h, FORMATION_LAYOUT.rosterItem.radius, {
        backgroundColor: 0x2a2a4a,
        borderColor: UITheme.colors.borderHighlight,
        borderWidth: 1,
        alpha: 0.95,
      });
    });

    hitArea.on('pointerout', () => {
      drawRoundedFrame(bg, 0, 0, w, h, FORMATION_LAYOUT.rosterItem.radius, baseState);
    });

    hitArea.on('pointerdown', () => this.onRosterClick(char));
    return container;
  }

  private onRosterClick(char: CharacterDefinition): void {
    if (this.selectedRosterCharId === char.id) {
      this.selectedRosterCharId = null;
      this.selectedActionSlot = null;
      this.refreshRoster();
      this.updateSelectionHud();
      return;
    }

    this.selectedRosterCharId = char.id;
    this.selectedActionSlot = null;
    this.refreshRoster();
    this.updateSelectionHud(char);
    this.toast.show(`${char.name} 선택됨 — 영역을 클릭해 배치하세요`);
  }

  private createZones(): void {
    this.add
      .text(
        FORMATION_LAYOUT.board.x + FORMATION_LAYOUT.board.width / 2,
        FORMATION_LAYOUT.board.y - 34,
        'TACTICAL BOARD',
        {
          ...UITheme.font.small,
          color: '#6d7fa5',
        },
      )
      .setOrigin(0.5)
      .setFontSize(12);

    for (const zone of ZONES) {
      this.createZoneVisual(zone);
    }
  }

  private createZoneVisual(zone: ZoneDef): void {
    const container = this.add.container(zone.x, zone.y);
    const lane = getFormationLanePresentation(zone.key);

    const bg = this.add.graphics();
    drawRoundedFrame(bg, 0, 0, zone.width, zone.height, 12, {
      backgroundColor: lane.glowColor,
      borderColor: lane.accentColor,
      borderWidth: 2,
      alpha: 0.45,
    });
    drawHorizontalDivider(bg, 14, 44, zone.width - 14, 0xffffff, 0.06);
    container.add(bg);

    for (let i = 0; i < zone.maxUnits; i++) {
      const slotX = 28 + i * ((zone.width - 56) / (zone.maxUnits - 1));
      const marker = this.add.graphics();
      drawRoundedFrame(marker, slotX - 36, 56, 72, 88, 10, {
        backgroundColor: 0x101522,
        borderColor: lane.accentColor,
        borderWidth: 1,
        alpha: 0.34,
      });
      container.add(marker);
    }

    container.add(
      this.add
        .text(18, 14, lane.title, {
          fontSize: '18px',
          fontFamily: UITheme.font.family,
          color: `#${lane.accentColor.toString(16).padStart(6, '0')}`,
        })
        .setOrigin(0, 0),
    );

    container.add(
      this.add
        .text(zone.width - 18, 18, lane.caption, { ...UITheme.font.small, color: '#7d8fb0' })
        .setOrigin(1, 0)
        .setFontSize(10),
    );

    const emptyText = this.add
      .text(zone.width / 2, zone.height / 2 + 6, 'EMPTY', {
        ...UITheme.font.small,
        color: '#334455',
        align: 'center',
      })
      .setOrigin(0.5)
      .setFontSize(12);
    container.add(emptyText);
    container.setData('emptyText', emptyText);

    const hitArea = this.add
      .rectangle(zone.width / 2, zone.height / 2, zone.width, zone.height, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerover', () => {
      drawRoundedFrame(bg, 0, 0, zone.width, zone.height, 12, {
        backgroundColor: lane.glowColor,
        borderColor: lane.accentColor,
        borderWidth: 2,
        alpha: 0.62,
      });
      drawHorizontalDivider(bg, 14, 44, zone.width - 14, 0xffffff, 0.08);
    });

    hitArea.on('pointerout', () => {
      drawRoundedFrame(bg, 0, 0, zone.width, zone.height, 12, {
        backgroundColor: lane.glowColor,
        borderColor: lane.accentColor,
        borderWidth: 2,
        alpha: 0.45,
      });
      drawHorizontalDivider(bg, 14, 44, zone.width - 14, 0xffffff, 0.06);
    });

    hitArea.on('pointerdown', () => this.onZoneClick(zone));
    this.zoneContainers.set(zone.key, container);
  }

  private onZoneClick(zone: ZoneDef): void {
    if (!this.selectedRosterCharId) {
      const charsInZone = this.getCharactersInZone(zone.key);
      if (charsInZone.length > 0) {
        const firstChar = charsInZone[0];
        this.selectedRosterCharId = firstChar.id;
        this.refreshRoster();
        this.updateSelectionHud(firstChar);
      } else {
        this.toast.show('좌측에서 캐릭터를 먼저 선택하세요');
      }
      return;
    }

    this.assignToZone(zone.key, this.selectedRosterCharId);
  }

  private getCharactersInZone(zoneKey: string): CharacterDefinition[] {
    const formation = gameState.formation;
    const position = zoneKey === 'FRONT' ? Position.FRONT : Position.BACK;
    return formation.slots
      .filter((s) => s.characterId && s.position === position)
      .map((s) => gameState.getCharacter(s.characterId))
      .filter((c): c is CharacterDefinition => !!c);
  }

  private assignToZone(zoneKey: 'FRONT' | 'BACK', characterId: string): void {
    const formation = gameState.formation;
    const targetPosition = zoneKey === 'FRONT' ? Position.FRONT : Position.BACK;
    const check = canAddToZone(formation, zoneKey, characterId);
    if (!check.allowed) {
      this.toast.show(check.reason ?? '배치할 수 없습니다');
      return;
    }

    let newSlots = formation.slots.filter((s) => s.characterId !== characterId);
    newSlots.push({ characterId, position: targetPosition });

    gameState.setFormation({
      slots: newSlots,
      heroType: formation.heroType,
    });

    const charName = gameState.getCharacter(characterId)?.name ?? '';
    this.selectedRosterCharId = null;
    this.refreshAll();
    this.toast.show(`${charName} → ${zoneKey} 배치 완료!`);
  }

  private refreshZones(): void {
    for (const visual of this.zoneUnitVisuals) visual.destroy();
    this.zoneUnitVisuals = [];

    for (const zone of ZONES) {
      const container = this.zoneContainers.get(zone.key);
      if (!container) continue;

      const emptyText = container.getData('emptyText') as Phaser.GameObjects.Text;
      const charsInZone = this.getCharactersInZone(zone.key);
      emptyText.setVisible(charsInZone.length === 0);
      if (charsInZone.length === 0) continue;

      const unitIds = charsInZone.map((c) => c.id);
      const positions = calculateRowLayout(unitIds, {
        xMin: 56,
        xMax: zone.width - 56,
        rowY: zone.height / 2 + 6,
        maxSlots: zone.maxUnits,
      });

      for (let i = 0; i < charsInZone.length; i++) {
        const unitVisual = this.createUnitInZone(charsInZone[i], positions[i].x, positions[i].y, zone);
        container.add(unitVisual);
        this.zoneUnitVisuals.push(unitVisual);
      }
    }
  }

  private createUnitInZone(
    char: CharacterDefinition,
    x: number,
    y: number,
    zone: ZoneDef,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const w = FORMATION_LAYOUT.unitCard.width;
    const h = FORMATION_LAYOUT.unitCard.height;

    const bg = this.add.graphics();
    drawRoundedFrame(bg, -w / 2, -h / 2, w, h, FORMATION_LAYOUT.unitCard.radius, getUnitCardVisualState(false));
    container.add(bg);

    container.add(
      this.add
        .text(-w / 2 + 10, -h / 2 + 10, char.characterClass.substring(0, 3), {
          ...UITheme.font.small,
          color: '#6688aa',
        })
        .setOrigin(0, 0)
        .setFontSize(9),
    );

    const spriteInfo = FORMATION_SPRITE_MAP[char.characterClass];
    if (spriteInfo) {
      container.add(
        this.add
          .sprite(0, -8, spriteInfo.texture, spriteInfo.idleFrame)
          .setScale(spriteInfo.scale * FORMATION_LAYOUT.unitCard.spriteScaleMultiplier)
          .setOrigin(0.5, 0.5),
      );
    }

    const nameText = this.add
      .text(0, 20, char.name, { ...UITheme.font.label, color: UITheme.colors.textPrimary })
      .setOrigin(0.5);
    nameText.setFontSize(10);
    container.add(nameText);

    const s = char.baseStats;
    container.add(
      this.add
        .text(0, 35, `HP${s.hp} A${s.atk}`, { ...UITheme.font.small, color: '#666688' })
        .setOrigin(0.5)
        .setFontSize(8),
    );

    const removeBtn = this.add
      .text(w / 2 - 4, -h / 2 + 4, '×', {
        fontSize: '12px',
        fontFamily: UITheme.font.family,
        color: '#aa4444',
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });
    container.add(removeBtn);

    removeBtn.on('pointerover', () => removeBtn.setColor('#ff6666'));
    removeBtn.on('pointerout', () => removeBtn.setColor('#aa4444'));
    removeBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.removeFromFormation(char.id);
    });

    const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.selectedRosterCharId = char.id;
      this.selectedActionSlot = null;
      this.refreshRoster();
      this.updateSelectionHud(char);
      this.toast.show(`${char.name} 선택됨 — 다른 영역을 클릭해 이동하세요`);
    });

    hitArea.on('pointerover', () => {
      drawRoundedFrame(bg, -w / 2, -h / 2, w, h, FORMATION_LAYOUT.unitCard.radius, getUnitCardVisualState(true));
    });

    hitArea.on('pointerout', () => {
      drawRoundedFrame(bg, -w / 2, -h / 2, w, h, FORMATION_LAYOUT.unitCard.radius, getUnitCardVisualState(false));
    });

    return container;
  }

  private removeFromFormation(characterId: string): void {
    const formation = gameState.formation;
    const newSlots = formation.slots.filter((s) => s.characterId !== characterId);
    gameState.setFormation({
      slots: newSlots,
      heroType: formation.heroType,
    });

    const charName = gameState.getCharacter(characterId)?.name ?? '';
    this.toast.show(`${charName} 편성 해제`);
    this.refreshAll();
  }

  private createBoardHud(): void {
    const labels = getFormationPanelLabels();
    const boardX = FORMATION_LAYOUT.hud.x;
    const boardY = FORMATION_LAYOUT.hud.y;
    const boardWidth = FORMATION_LAYOUT.hud.width;
    const boardHeight = FORMATION_LAYOUT.hud.height;

    const bg = this.add.graphics();
    drawRoundedFrame(bg, boardX, boardY, boardWidth, boardHeight, FORMATION_LAYOUT.hud.radius, {
      backgroundColor: 0x14192a,
      borderColor: 0x33486a,
      borderWidth: 2,
      alpha: 0.96,
    });

    this.add
      .text(boardX + 18, boardY + 14, labels.command, {
        fontSize: '11px',
        fontFamily: UITheme.font.family,
        color: '#7f95bd',
      })
      .setOrigin(0, 0);

    this.currentHeroText = this.add.text(boardX + 18, boardY + 34, '', {
      fontSize: '18px',
      fontFamily: UITheme.font.family,
      color: UITheme.colors.textPrimary,
    });

    this.selectedUnitTitle = this.add.text(boardX + 18, boardY + 72, 'UNIT', {
      ...UITheme.font.label,
      color: '#7f95bd',
    });

    this.selectedUnitMeta = this.add.text(boardX + 96, boardY + 72, '', {
      ...UITheme.font.small,
      color: UITheme.colors.textPrimary,
    });

    this.selectedUnitTactics = this.add.text(boardX + 18, boardY + 96, '', {
      ...UITheme.font.small,
      color: '#9fb3d8',
      wordWrap: { width: boardWidth - 36 },
    });
  }

  private refreshCommandHud(): void {
    const heroType = gameState.formation.heroType;
    const hero = HERO_DEFINITIONS[heroType];
    if (!hero) {
      this.currentHeroText.setText('');
      return;
    }

    const lockTag = gameState.runState ? '  [LOCKED]' : '';
    this.currentHeroText.setText(`${hero.name}${lockTag}`);
  }

  private updateSelectionHud(char?: CharacterDefinition): void {
    if (!char) {
      this.selectedUnitMeta.setText('선택한 유닛 없음');
      this.selectedUnitTactics.setText('로스터나 보드에서 유닛을 선택한 뒤 TACTICS에서 행동 카드를 조정하세요.');
      return;
    }

    const stats = char.baseStats;
    const zoneLabel = gameState.formation.slots.find((slot) => slot.characterId === char.id)?.position ?? 'UNASSIGNED';
    const slotData = getSlotDisplayData(char, gameState.runState);
    const actions = slotData.map((slot, index) => `${index + 1}. ${slot.action.name}`).join('   ');

    this.selectedUnitMeta.setText(
      `${char.name} / ${char.characterClass}  HP ${stats.hp}  ATK ${stats.atk}  GRD ${stats.grd}  AGI ${stats.agi}  LINE ${zoneLabel}`,
    );
    this.selectedUnitTactics.setText(actions);
  }

  private onActionSlotClick(char: CharacterDefinition, slot: SlotDisplayData): void {
    if (this.selectedActionSlot === slot.slotIndex) {
      if (!slot.isBase && gameState.runState) {
        const newRunState = unequipCard(gameState.runState, char.id, slot.slotIndex);
        gameState.setRunState(newRunState);
        this.selectedActionSlot = null;
        this.toast.show(`슬롯 ${slot.slotIndex + 1} 카드 해제`);
      } else {
        this.selectedActionSlot = null;
      }
    } else {
      this.selectedActionSlot = slot.slotIndex;
      this.toast.show(`슬롯 ${slot.slotIndex + 1} 선택 — 인벤토리에서 카드를 선택하세요`);
    }
    this.overlays.openCardEditorOverlay(char);
  }

  private onSwapSlots(char: CharacterDefinition, indexA: number, indexB: number): void {
    const runState = gameState.runState;

    if (runState) {
      const newRunState = swapRunActionSlots(runState, char.id, indexA, indexB);
      gameState.setRunState(newRunState);
      const updatedChar = newRunState.party.find((c) => c.id === char.id) ?? char;
      this.updateSelectionHud(updatedChar);
      this.overlays.openCardEditorOverlay(updatedChar);
    } else {
      const newCharDef = swapBaseActionSlots(char, indexA, indexB);
      gameState.updateCharacter(newCharDef);
      this.updateSelectionHud(newCharDef);
      this.overlays.openCardEditorOverlay(newCharDef);
    }

    this.toast.show(`슬롯 ${indexA + 1} ⇄ 슬롯 ${indexB + 1}`);
  }

  private onInventoryCardClick(char: CharacterDefinition, card: CardInstance): void {
    if (this.selectedActionSlot === null || !gameState.runState) return;

    const newRunState = equipCard(gameState.runState, char.id, this.selectedActionSlot, card.instanceId);
    gameState.setRunState(newRunState);
    this.toast.show(`${card.action.name} → 슬롯 ${this.selectedActionSlot + 1}`);
    this.selectedActionSlot = null;
    this.updateSelectionHud(char);
    this.overlays.openCardEditorOverlay(char);
  }

  private createBottomButtons(): void {
    const backConfig = getFormationBackButtonConfig(this.flowContext);
    const actionConfig = getFormationActionButtonConfig(this.flowContext);
    const labels = getFormationPanelLabels();
    const backWidth = backConfig.label.includes('포기') ? 160 : 140;

    new UIButton(this, {
      x: FORMATION_LAYOUT.bottomButtons.backX,
      y: FORMATION_LAYOUT.bottomButtons.y,
      width: backWidth,
      height: 44,
      label: backConfig.label,
      style: 'secondary',
      onClick: () => {
        if (backConfig.targetScene === 'RunResultScene') {
          const rs = gameState.runState;
          if (rs) {
            const defeatState = { ...rs, status: RunStatus.DEFEAT } as RunState;
            this.scene.start('RunResultScene', { runState: defeatState });
          } else {
            this.scene.start('TownScene');
          }
        } else if (backConfig.targetScene === 'RunMapScene') {
          this.scene.start('RunMapScene');
        } else {
          this.scene.start('TownScene');
        }
      },
    });

    new UIButton(this, {
      x: FORMATION_LAYOUT.bottomButtons.commandX,
      y: FORMATION_LAYOUT.bottomButtons.y,
      width: 140,
      height: 44,
      label: labels.command,
      style: 'secondary',
      onClick: () => this.overlays.openCommandOverlay(),
    });

    new UIButton(this, {
      x: FORMATION_LAYOUT.bottomButtons.presetsX,
      y: FORMATION_LAYOUT.bottomButtons.y,
      width: 140,
      height: 44,
      label: labels.presets,
      style: 'secondary',
      onClick: () => this.overlays.openPresetOverlay(),
    });

    new UIButton(this, {
      x: FORMATION_LAYOUT.bottomButtons.cardsX,
      y: FORMATION_LAYOUT.bottomButtons.y,
      width: 140,
      height: 44,
      label: labels.cards,
      style: 'secondary',
      onClick: () => {
        const selectedChar = this.getSelectedCharacter();
        if (!selectedChar) {
          this.toast.show('캐릭터를 먼저 선택하세요');
          return;
        }
        this.overlays.openCardEditorOverlay(selectedChar);
      },
    });

    new UIButton(this, {
      x: FORMATION_LAYOUT.bottomButtons.deployX,
      y: FORMATION_LAYOUT.bottomButtons.y,
      width: 180,
      height: 44,
      label: actionConfig.targetScene === 'TownScene' ? labels.deploy : actionConfig.label,
      style: 'primary',
      onClick: () => {
        const result = validateFormation(gameState.formation);
        if (!result.valid) {
          new UIModal(this, {
            title: '편성 오류',
            content: result.errors.join('\n'),
          });
          return;
        }

        if (actionConfig.targetScene === 'RunMapScene') {
          this.scene.start('RunMapScene');
        } else {
          this.scene.start('TownScene');
        }
      },
    });
  }

  private getSelectedCharacter(): CharacterDefinition | null {
    if (!this.selectedRosterCharId) return null;
    return gameState.getCharacter(this.selectedRosterCharId) ?? null;
  }

  private refreshAll(): void {
    this.refreshRoster();
    this.refreshZones();
    this.refreshCommandHud();
    this.updateSelectionHud(this.getSelectedCharacter() ?? undefined);
  }
}
