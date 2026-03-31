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
import { canAddToZone, validateFormation } from '../systems/FormationValidator';
import { getFormationPanelLabels } from '../systems/FormationPresentation';
import { FORMATION_LAYOUT } from '../systems/FormationSceneLayout';
import { drawRoundedFrame } from '../ui/FormationGraphics';
import { FormationSceneOverlays } from '../systems/FormationSceneOverlays';
import { getCharactersInBoardZone } from '../systems/FormationBoardState';
import { FormationBoardView } from '../ui/FormationBoardView';
import { FormationRosterView } from '../ui/FormationRosterView';
import { FormationHudView } from '../ui/FormationHudView';

export class FormationScene extends Phaser.Scene {
  private selectedActionSlot: number | null = null;
  private selectedRosterCharId: string | null = null;
  private toast!: UIToast;
  private overlays!: FormationSceneOverlays;
  private boardView!: FormationBoardView;
  private rosterView!: FormationRosterView;
  private hudView!: FormationHudView;

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
    });
    this.boardView.create();
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
    this.toast.show(`${char.name} 선택됨 — 영역을 클릭해 배치하세요`);
  }

  private onZoneClick(zone: { key: 'FRONT' | 'BACK' }): void {
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
    return getCharactersInBoardZone(gameState.formation, gameState.characters, zoneKey as 'FRONT' | 'BACK');
  }

  private assignToZone(zoneKey: 'FRONT' | 'BACK', characterId: string): void {
    const formation = gameState.formation;
    const targetPosition = zoneKey === 'FRONT' ? Position.FRONT : Position.BACK;
    const check = canAddToZone(formation, zoneKey, characterId);
    if (!check.allowed) {
      this.toast.show(check.reason ?? '배치할 수 없습니다');
      return;
    }

    const newSlots = formation.slots.filter((slot) => slot.characterId !== characterId);
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

  private onBoardUnitSelect(char: CharacterDefinition): void {
    this.selectedRosterCharId = char.id;
    this.selectedActionSlot = null;
    this.refreshRoster();
    this.updateSelectionHud(char);
    this.toast.show(`${char.name} 선택됨 — 다른 영역을 클릭해 이동하세요`);
  }

  private removeFromFormation(characterId: string): void {
    const formation = gameState.formation;
    const newSlots = formation.slots.filter((slot) => slot.characterId !== characterId);
    gameState.setFormation({
      slots: newSlots,
      heroType: formation.heroType,
    });

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
      actionNames: slotData.map((slot) => slot.action.name),
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

  private refreshAll(): void {
    this.refreshRoster();
    this.boardView.refresh();
    this.refreshCommandHud();
    this.updateSelectionHud(this.getSelectedCharacter() ?? undefined);
  }
}
