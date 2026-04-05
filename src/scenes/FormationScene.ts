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
import { UIToast } from '../ui/UIToast';
import { UIButton } from '../ui/UIButton';
import { UIModal } from '../ui/UIModal';
import { gameState } from '../core/GameState';
import { RunStatus } from '../types';
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
import { validateFormation } from '../systems/FormationValidator';
import { getFormationPanelLabels } from '../systems/FormationPresentation';
import { FORMATION_LAYOUT } from '../systems/FormationSceneLayout';
import { drawRoundedFrame } from '../ui/FormationGraphics';
import { FormationSceneOverlays } from '../systems/FormationSceneOverlays';
import { getCharactersInBoardZone } from '../systems/FormationBoardState';
import { FormationBoardView } from '../ui/FormationBoardView';
import { FormationRosterView } from '../ui/FormationRosterView';
import { FormationHudView } from '../ui/FormationHudView';
import {
  moveCharacterToZone,
  removeCharacterFromFormation,
  replaceCharacterInFormation,
  swapCharactersInFormation,
  type FormationZoneKey,
} from '../systems/FormationInteraction';

export class FormationScene extends Phaser.Scene {
  private selectedActionSlot: number | null = null;
  private selectedRosterCharId: string | null = null;
  private toast!: UIToast;
  private overlays!: FormationSceneOverlays;
  private boardView!: FormationBoardView;
  private rosterView!: FormationRosterView;
  private hudView!: FormationHudView;
  private dragCharacterId: string | null = null;
  private dragStartPoint: { x: number; y: number } | null = null;
  private dragGhost: Phaser.GameObjects.Container | null = null;
  private isDragging = false;

  private isRetry = false;
  private flowContext: FormationFlowContext = 'TOWN';
  private defeatedByEnemies: Array<{ name: string; characterClass: string; hp: number; maxHp: number }> = [];

  constructor() {
    super({ key: 'FormationScene' });
  }

  create(data?: FormationSceneData): void {
    this.selectedRosterCharId = null;
    this.selectedActionSlot = null;
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

    this.rosterView = new FormationRosterView(this, {
      getCharacters: () => gameState.characters,
      getFormationIds: () => new Set(gameState.getFormationCharacterIds()),
      getSelectedCharacterId: () => this.selectedRosterCharId,
      onSelect: (char) => this.onRosterClick(char),
      onPress: (char, pointer) => this.onCharacterPress(char, pointer),
    });
    this.rosterView.create();

    this.hudView = new FormationHudView(this);
    this.hudView.create();

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

    this.boardView = new FormationBoardView(this, {
      getCharactersInZone: (zoneKey) => this.getCharactersInZone(zoneKey),
      onZoneClick: (zone) => this.onZoneClick(zone),
      onUnitSelect: (char) => this.onBoardUnitSelect(char),
      onRemoveUnit: (charId) => this.removeFromFormation(charId),
      onUnitPress: (char, pointer) => this.onCharacterPress(char, pointer),
    });
    this.boardView.create();
    this.registerDragHandlers();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointermove', this.handlePointerMove, this);
      this.input.off('pointerup', this.handlePointerUp, this);
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

  private refreshRoster(): void {
    this.rosterView.refresh();
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
    this.toast.show(`${char.name} 선택됨`);
  }

  private onZoneClick(zone: { key: 'FRONT' | 'BACK' }): void {
    const charsInZone = this.getCharactersInZone(zone.key);
    if (charsInZone.length > 0) {
      const firstChar = charsInZone[0];
      this.selectedRosterCharId = firstChar.id;
      this.selectedActionSlot = null;
      this.refreshRoster();
      this.updateSelectionHud(firstChar);
    }
  }

  private getCharactersInZone(zoneKey: string): CharacterDefinition[] {
    return getCharactersInBoardZone(gameState.formation, gameState.characters, zoneKey as 'FRONT' | 'BACK');
  }

  private assignToZone(zoneKey: 'FRONT' | 'BACK', characterId: string): void {
    const result = moveCharacterToZone(gameState.formation, characterId, zoneKey);
    if (!result.changed) {
      this.toast.show(result.reason === 'formation-full' ? '출전 인원이 이미 4명입니다' : '배치할 수 없습니다');
      return;
    }

    gameState.setFormation(result.formation);
    const charName = gameState.getCharacter(characterId)?.name ?? '';
    this.selectedRosterCharId = null;
    this.refreshAll();
    this.toast.show(`${charName} → ${zoneKey} 배치 완료!`);
  }

  private onBoardUnitSelect(char: CharacterDefinition): void {
    this.selectedRosterCharId = char.id;
    this.selectedActionSlot = null;
    this.refreshRoster();
    this.updateSelectionHud(char);
    this.toast.show(`${char.name} 선택됨`);
  }

  private removeFromFormation(characterId: string): void {
    const result = removeCharacterFromFormation(gameState.formation, characterId);
    if (!result.changed) return;
    gameState.setFormation(result.formation);

    const charName = gameState.getCharacter(characterId)?.name ?? '';
    this.toast.show(`${charName} 편성 해제`);
    this.refreshAll();
  }

  private refreshCommandHud(): void {
    const heroType = gameState.formation.heroType;
    const hero = HERO_DEFINITIONS[heroType];
    this.hudView.refreshHero(hero?.name ?? null, !!gameState.runState);
  }

  private updateSelectionHud(char?: CharacterDefinition): void {
    const zoneLabel = char
      ? (gameState.formation.slots.find((slot) => slot.characterId === char.id)?.position ?? 'UNASSIGNED')
      : undefined;
    const slotData = char ? getSlotDisplayData(char, gameState.runState) : [];

    this.hudView.refreshSelection({
      character: char,
      zoneLabel,
      actionSlots: slotData.map((slot) => ({ condition: slot.condition, action: slot.action })),
    });
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
      const updatedChar = newRunState.party.find((character) => character.id === char.id) ?? char;
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

  private onCharacterPress(char: CharacterDefinition, pointer: Phaser.Input.Pointer): void {
    this.dragCharacterId = char.id;
    this.dragStartPoint = { x: pointer.worldX, y: pointer.worldY };
    this.isDragging = false;
  }

  private registerDragHandlers(): void {
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerup', this.handlePointerUp, this);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragCharacterId || !this.dragStartPoint) return;

    if (!this.isDragging) {
      const distance = Phaser.Math.Distance.Between(
        this.dragStartPoint.x,
        this.dragStartPoint.y,
        pointer.worldX,
        pointer.worldY,
      );
      if (distance < 10) return;
      this.startDragVisual(this.dragCharacterId, pointer.worldX, pointer.worldY);
      this.isDragging = true;
    }

    this.dragGhost?.setPosition(pointer.worldX + 18, pointer.worldY + 18);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.dragCharacterId) return;

    const char = gameState.getCharacter(this.dragCharacterId);
    const wasDragging = this.isDragging;
    this.clearDragState();
    if (!char) return;

    if (!wasDragging) {
      const isAssigned = gameState.getFormationCharacterIds().includes(char.id);
      if (isAssigned) {
        this.onBoardUnitSelect(char);
      } else {
        this.onRosterClick(char);
      }
      return;
    }

    const targetUnit = this.boardView.getUnitAt(pointer.worldX, pointer.worldY);
    if (targetUnit && targetUnit.id !== char.id) {
      const isAssigned = gameState.getFormationCharacterIds().includes(char.id);
      const result = isAssigned
        ? swapCharactersInFormation(gameState.formation, char.id, targetUnit.id)
        : replaceCharacterInFormation(gameState.formation, char.id, targetUnit.id);

      if (result.changed) {
        gameState.setFormation(result.formation);
        this.selectedRosterCharId = char.id;
        this.refreshAll();
        this.toast.show(
          isAssigned ? `${char.name} ⇄ ${targetUnit.name} 위치 교체` : `${char.name} 영입 → ${targetUnit.name} 교체`,
        );
        return;
      }
    }

    const targetZone = this.boardView.getZoneAt(pointer.worldX, pointer.worldY);
    if (targetZone) {
      const result = moveCharacterToZone(gameState.formation, char.id, targetZone.key as FormationZoneKey);
      if (result.changed) {
        gameState.setFormation(result.formation);
        this.selectedRosterCharId = char.id;
        this.refreshAll();
        this.toast.show(`${char.name} → ${targetZone.key} 배치 완료!`);
        return;
      }
      this.toast.show(result.reason === 'formation-full' ? '출전 인원이 이미 4명입니다' : '배치할 수 없습니다');
      return;
    }

    if (this.rosterView.containsPoint(pointer.worldX, pointer.worldY)) {
      const result = removeCharacterFromFormation(gameState.formation, char.id);
      if (result.changed) {
        gameState.setFormation(result.formation);
        this.selectedRosterCharId = char.id;
        this.refreshAll();
        this.toast.show(`${char.name} 편성 해제`);
      }
    }
  }

  private startDragVisual(characterId: string, worldX: number, worldY: number): void {
    const char = gameState.getCharacter(characterId);
    if (!char) return;

    const bg = this.add.graphics();
    drawRoundedFrame(bg, 0, 0, 112, 38, 8, {
      backgroundColor: 0x223256,
      borderColor: 0x7da2ff,
      borderWidth: 1,
      alpha: 0.92,
    });

    const label = this.add.text(56, 19, char.name, { ...UITheme.font.label, color: '#ffffff' }).setOrigin(0.5);

    this.dragGhost = this.add
      .container(worldX + 18, worldY + 18, [bg, label])
      .setDepth(2000)
      .setAlpha(0.95);
  }

  private clearDragState(): void {
    this.dragCharacterId = null;
    this.dragStartPoint = null;
    this.isDragging = false;
    this.dragGhost?.destroy();
    this.dragGhost = null;
  }

  private refreshAll(): void {
    this.refreshRoster();
    this.boardView.refresh();
    this.refreshCommandHud();
    this.updateSelectionHud(this.getSelectedCharacter() ?? undefined);
  }
}
