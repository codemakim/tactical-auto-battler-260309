import Phaser from 'phaser';
import { HERO_DEFINITIONS } from '../data/HeroDefinitions';
import { gameState } from '../core/GameState';
import { getEquippableCards } from '../core/RunManager';
import { FORMATION_LAYOUT, HERO_TYPES } from './FormationSceneLayout';
import { getCommandCardVisualState } from './FormationSceneStyles';
import { drawRoundedFrame } from '../ui/FormationGraphics';
import { UITheme } from '../ui/UITheme';
import { UIPanel } from '../ui/UIPanel';
import { UIButton } from '../ui/UIButton';
import { UICardVisual } from '../ui/UICardVisual';
import { shouldCloseModalFromBackdrop } from '../ui/ModalHitTest';
import { getFormationPanelLabels } from './FormationPresentation';
import { getFormationPresetSlots, getFormationPresetSlotName } from './FormationPresetSlots';
import { formatSlotsSummary } from '../utils/actionText';
import { getSlotDisplayData } from './FormationCardCalculator';
import type { CardInstance, CharacterDefinition, RunState, SlotDisplayData } from '../types';

export class FormationSceneOverlays {
  private readonly scene: Phaser.Scene;
  private readonly deps: {
    getSelectedActionSlot: () => number | null;
    showToast: (message: string) => void;
    refreshAll: () => void;
    refreshCommandHud: () => void;
    onActionSlotClick: (char: CharacterDefinition, slot: SlotDisplayData) => void;
    onSwapSlots: (char: CharacterDefinition, indexA: number, indexB: number) => void;
    onInventoryCardClick: (char: CharacterDefinition, card: CardInstance) => void;
  };
  private overlayDim?: Phaser.GameObjects.Rectangle;
  private overlayPanel?: UIPanel;
  private overlayButtons: UIButton[] = [];
  private overlayDynamic: Phaser.GameObjects.GameObject[] = [];
  private slotCards: UICardVisual[] = [];
  private inventoryCards: UICardVisual[] = [];
  private selectedPresetSlotIndex = 0;

  constructor(
    scene: Phaser.Scene,
    deps: {
      getSelectedActionSlot: () => number | null;
      showToast: (message: string) => void;
      refreshAll: () => void;
      refreshCommandHud: () => void;
      onActionSlotClick: (char: CharacterDefinition, slot: SlotDisplayData) => void;
      onSwapSlots: (char: CharacterDefinition, indexA: number, indexB: number) => void;
      onInventoryCardClick: (char: CharacterDefinition, card: CardInstance) => void;
    },
  ) {
    this.scene = scene;
    this.deps = deps;
  }

  destroy(): void {
    for (const card of this.slotCards) card.destroy();
    this.slotCards = [];
    for (const card of this.inventoryCards) card.destroy();
    this.inventoryCards = [];
    this.overlayButtons.forEach((button) => button.destroy());
    this.overlayButtons = [];
    this.overlayDynamic.forEach((obj) => obj.destroy());
    this.overlayDynamic = [];
    this.overlayPanel?.destroy();
    this.overlayPanel = undefined;
    this.overlayDim?.destroy();
    this.overlayDim = undefined;
  }

  openCommandOverlay(): void {
    const labels = getFormationPanelLabels();
    const contentY = this.createOverlay(
      labels.command,
      FORMATION_LAYOUT.overlays.command.width,
      FORMATION_LAYOUT.overlays.command.height,
    );
    const panel = this.overlayPanel;
    if (!panel) return;

    const currentHero = gameState.formation.heroType;
    const isRun = !!gameState.runState;
    const startX = UITheme.panel.padding;
    const startY = contentY + 12;
    const { cardWidth, cardGap } = FORMATION_LAYOUT.overlays.command;

    HERO_TYPES.forEach((heroType, index) => {
      const def = HERO_DEFINITIONS[heroType];
      const isSelected = heroType === currentHero;
      const isLocked = isRun && !isSelected;
      const x = startX + index * (cardWidth + cardGap);
      const y = startY;

      const bg = this.scene.add.graphics();
      drawRoundedFrame(bg, x, y, cardWidth, 122, 10, getCommandCardVisualState(isSelected));
      panel.add(bg);
      this.overlayDynamic.push(bg);

      const name = this.scene.add.text(x + 16, y + 14, def.name, {
        ...UITheme.font.label,
        color: isLocked ? UITheme.colors.textDisabled : UITheme.colors.textPrimary,
      });
      panel.add(name);
      this.overlayDynamic.push(name);

      const desc = this.scene.add.text(x + 16, y + 42, def.description, {
        ...UITheme.font.small,
        color: '#93a5c5',
        wordWrap: { width: cardWidth - 32 },
      });
      panel.add(desc);
      this.overlayDynamic.push(desc);

      const abilitySummary = this.scene.add.text(
        x + 16,
        y + 82,
        def.abilities
          .map((ability) => ability.name)
          .slice(0, 2)
          .join(' / '),
        {
          ...UITheme.font.small,
          color: '#6eb2ff',
          wordWrap: { width: cardWidth - 32 },
        },
      );
      panel.add(abilitySummary);
      this.overlayDynamic.push(abilitySummary);

      const hitArea = this.scene.add
        .rectangle(x + cardWidth / 2, y + 61, cardWidth, 122, 0x000000, 0)
        .setInteractive({ useHandCursor: !isLocked });
      panel.add(hitArea);
      this.overlayDynamic.push(hitArea);

      if (!isLocked) {
        hitArea.on('pointerdown', () => {
          if (heroType !== currentHero) {
            gameState.setHeroType(heroType);
            this.deps.refreshCommandHud();
            this.deps.showToast(`${def.name} 선택`);
          }
          this.destroy();
        });
      }
    });

    const hint = this.scene.add.text(
      UITheme.panel.padding,
      contentY + 164,
      isRun ? '런 중에는 현재 COMMAND만 유지됩니다.' : 'COMMAND는 런 시작 전까지 자유롭게 변경할 수 있습니다.',
      {
        ...UITheme.font.small,
        color: isRun ? '#f5c06a' : UITheme.colors.textSecondary,
      },
    );
    panel.add(hint);
    this.overlayDynamic.push(hint);

    this.addCloseButton(FORMATION_LAYOUT.overlays.command.width, FORMATION_LAYOUT.overlays.command.height);
  }

  openPresetOverlay(): void {
    const contentY = this.createOverlay(
      '편성 프리셋',
      FORMATION_LAYOUT.overlays.preset.width,
      FORMATION_LAYOUT.overlays.preset.height,
    );
    const panel = this.overlayPanel;
    if (!panel) return;

    const slots = getFormationPresetSlots(gameState.presets);
    const startY = contentY + 8;

    slots.forEach((slot, index) => {
      const isSelected = index === this.selectedPresetSlotIndex;
      const button = new UIButton(this.scene, {
        x: UITheme.panel.padding + index * 170,
        y: startY,
        width: FORMATION_LAYOUT.overlays.preset.slotButtonWidth,
        height: 40,
        label: slot.filled ? slot.name : `${slot.name} (Empty)`,
        style: isSelected ? 'primary' : 'secondary',
        onClick: () => {
          this.selectedPresetSlotIndex = index;
          this.openPresetOverlay();
        },
      });
      panel.add(button.container);
      this.overlayButtons.push(button);
    });

    const selectedSlot = slots[this.selectedPresetSlotIndex];
    const summary = this.scene.add.text(
      UITheme.panel.padding,
      startY + 56,
      selectedSlot.filled
        ? `${selectedSlot.name}: ${selectedSlot.preset!.formation.slots.length} units / ${selectedSlot.preset!.formation.heroType}`
        : `${selectedSlot.name}: 비어 있음`,
      { ...UITheme.font.body, color: selectedSlot.filled ? UITheme.colors.textAccent : UITheme.colors.textSecondary },
    );
    panel.add(summary);
    this.overlayDynamic.push(summary);

    const saveBtn = new UIButton(this.scene, {
      x: 140,
      y: 150,
      width: 100,
      height: 40,
      label: '저장',
      style: 'primary',
      onClick: () => {
        const name = getFormationPresetSlotName(this.selectedPresetSlotIndex);
        gameState.savePreset(name);
        this.deps.showToast(`${name} 저장`);
        this.openPresetOverlay();
      },
    });
    panel.add(saveBtn.container);
    this.overlayButtons.push(saveBtn);

    const loadBtn = new UIButton(this.scene, {
      x: 250,
      y: 150,
      width: 100,
      height: 40,
      label: '불러오기',
      style: 'secondary',
      disabled: !selectedSlot.filled,
      onClick: () => {
        if (!selectedSlot.filled) return;
        gameState.loadPreset(selectedSlot.name);
        this.deps.showToast(`${selectedSlot.name} 불러오기`);
        this.deps.refreshAll();
        this.openPresetOverlay();
      },
    });
    panel.add(loadBtn.container);
    this.overlayButtons.push(loadBtn);

    const deleteBtn = new UIButton(this.scene, {
      x: 360,
      y: 150,
      width: 100,
      height: 40,
      label: '삭제',
      style: 'secondary',
      disabled: !selectedSlot.filled,
      onClick: () => {
        if (!selectedSlot.filled) return;
        gameState.deletePreset(selectedSlot.name);
        this.deps.showToast(`${selectedSlot.name} 삭제`);
        this.openPresetOverlay();
      },
    });
    panel.add(deleteBtn.container);
    this.overlayButtons.push(deleteBtn);
  }

  openCardEditorOverlay(char: CharacterDefinition): void {
    const overlayWidth = FORMATION_LAYOUT.overlays.cardEditor.width;
    const overlayHeight = FORMATION_LAYOUT.overlays.cardEditor.height;
    const contentY = this.createOverlay('카드 편집', overlayWidth, overlayHeight);
    const panel = this.overlayPanel;
    if (!panel) return;

    const s = char.baseStats;
    const header = this.scene.add.text(
      UITheme.panel.padding,
      contentY,
      `${char.name} — ${char.characterClass}\nHP: ${s.hp}  ATK: ${s.atk}  GRD: ${s.grd}  AGI: ${s.agi}`,
      { ...UITheme.font.body, color: UITheme.colors.textPrimary },
    );
    panel.add(header);
    this.overlayDynamic.push(header);

    const runState = gameState.runState;
    const isRun = !!runState;
    const slotData = getSlotDisplayData(char, runState);
    const { cardWidth, cardHeight, cardGap } = FORMATION_LAYOUT.overlays.cardEditor;
    const slotStartX = UITheme.panel.padding;
    const slotStartY = contentY + 74;
    const logicX = slotStartX + 3 * cardWidth + 2 * cardGap + 34;
    const logicY = slotStartY - 4;

    for (const slot of slotData) {
      const cx = slotStartX + slot.slotIndex * (cardWidth + cardGap);
      const card = new UICardVisual(this.scene, {
        x: cx,
        y: slotStartY,
        width: cardWidth,
        height: cardHeight,
        action: slot.action,
        condition: slot.condition,
        rarity: slot.equippedCard?.rarity,
        classRestriction: slot.equippedCard?.classRestriction,
        interactive: isRun,
        selected: this.deps.getSelectedActionSlot() === slot.slotIndex,
        onClick: isRun ? () => this.deps.onActionSlotClick(char, slot) : undefined,
      });
      panel.add(card.container);
      this.slotCards.push(card);
    }

    for (let i = 0; i < slotData.length; i++) {
      const lx = slotStartX + i * (cardWidth + cardGap) + cardWidth / 2;
      const priority = this.scene.add
        .text(lx, slotStartY - 18, `${'\u2460\u2461\u2462'[i]}`, {
          fontSize: '16px',
          fontFamily: UITheme.font.family,
          color: this.deps.getSelectedActionSlot() === i ? '#ffcc00' : '#aabbcc',
        })
        .setOrigin(0.5, 0);
      panel.add(priority);
      this.overlayDynamic.push(priority);

      const label = this.scene.add
        .text(lx, slotStartY + cardHeight + 4, `슬롯 ${i + 1}`, {
          ...UITheme.font.small,
          color: this.deps.getSelectedActionSlot() === i ? '#ffcc00' : UITheme.colors.textSecondary,
        })
        .setOrigin(0.5, 0);
      panel.add(label);
      this.overlayDynamic.push(label);
    }

    for (let i = 0; i < slotData.length - 1; i++) {
      const bx = slotStartX + (i + 1) * (cardWidth + cardGap) - cardGap / 2;
      const by = slotStartY + cardHeight / 2;
      const swapIdx = i;
      const swapBtn = this.scene.add
        .text(bx, by, '⇄', {
          fontSize: '20px',
          fontFamily: UITheme.font.family,
          color: '#aabbcc',
          backgroundColor: '#1a1a2e',
          padding: { x: 4, y: 2 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      swapBtn.on('pointerover', () => swapBtn.setColor('#ffcc00'));
      swapBtn.on('pointerout', () => swapBtn.setColor('#aabbcc'));
      swapBtn.on('pointerdown', () => this.deps.onSwapSlots(char, swapIdx, swapIdx + 1));
      panel.add(swapBtn);
      this.overlayDynamic.push(swapBtn);
    }

    this.renderLogicSummary(panel, slotData, logicX, logicY, 250);
    if (isRun && runState) {
      const inventoryY = slotStartY + cardHeight + 52;
      this.renderInventory(panel, char, runState, inventoryY);
    }

    this.addCloseButton(overlayWidth, overlayHeight);
  }

  private createOverlay(title: string, width: number, height: number): number {
    this.destroy();
    const panelX = (this.scene.scale.width - width) / 2;
    const panelY = (this.scene.scale.height - height) / 2;
    this.overlayDim = this.scene.add
      .rectangle(
        this.scene.scale.width / 2,
        this.scene.scale.height / 2,
        this.scene.scale.width,
        this.scene.scale.height,
        0x000000,
        0.7,
      )
      .setInteractive()
      .setDepth(100);
    this.overlayDim.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (shouldCloseModalFromBackdrop({ x: pointer.x, y: pointer.y }, { x: panelX, y: panelY, width, height })) {
        this.destroy();
      }
    });

    this.overlayPanel = new UIPanel(this.scene, {
      x: panelX,
      y: panelY,
      width,
      height,
      title,
      borderColor: UITheme.colors.borderLight,
    });
    this.overlayPanel.setDepth(101);
    return this.overlayPanel.contentY;
  }

  private addCloseButton(width: number, height: number): void {
    const panel = this.overlayPanel;
    if (!panel) return;
    const closeBtn = new UIButton(this.scene, {
      x: width - 136,
      y: height - 72,
      width: 120,
      height: 42,
      label: '닫기',
      style: 'secondary',
      onClick: () => this.destroy(),
    });
    panel.add(closeBtn.container);
    this.overlayButtons.push(closeBtn);
  }

  private renderLogicSummary(
    panel: UIPanel,
    slotData: SlotDisplayData[],
    startX: number,
    startY: number,
    width: number,
  ): void {
    const slots = slotData.map((s) => ({ condition: s.condition, action: s.action }));
    const lines = formatSlotsSummary(slots);
    const headerText = this.scene.add.text(startX, startY, '[행동 로직]', {
      ...UITheme.font.small,
      fontSize: '12px',
      color: UITheme.colors.textSecondary,
    });
    panel.add(headerText);
    this.overlayDynamic.push(headerText);
    for (let i = 0; i < lines.length; i++) {
      const ly = startY + 20 + i * 20;
      const lineText = this.scene.add.text(startX + 4, ly, lines[i], {
        fontFamily: UITheme.font.family,
        fontSize: '13px',
        color: '#ccddee',
        wordWrap: { width },
      });
      panel.add(lineText);
      this.overlayDynamic.push(lineText);
    }
  }

  private renderInventory(panel: UIPanel, char: CharacterDefinition, runState: RunState, startY: number): void {
    const equippable = getEquippableCards(runState, char.id);
    const invLabel = this.scene.add.text(UITheme.panel.padding, startY, '인벤토리', {
      ...UITheme.font.label,
      color: UITheme.colors.textAccent,
    });
    panel.add(invLabel);
    this.overlayDynamic.push(invLabel);

    if (equippable.length === 0) {
      const noCards = this.scene.add.text(UITheme.panel.padding, startY + 22, '장착 가능한 카드 없음', {
        ...UITheme.font.small,
        color: UITheme.colors.textDisabled,
      });
      panel.add(noCards);
      this.overlayDynamic.push(noCards);
      return;
    }

    const cardW = 110;
    const cardH = 150;
    const cardGap = 12;
    const cols = 5;
    const invStartY = startY + 20;
    for (let i = 0; i < equippable.length; i++) {
      const invCard = equippable[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = UITheme.panel.padding + col * (cardW + cardGap);
      const cy = invStartY + row * (cardH + cardGap);
      const visual = new UICardVisual(this.scene, {
        x: cx,
        y: cy,
        width: cardW,
        height: cardH,
        action: invCard.action,
        rarity: invCard.rarity,
        classRestriction: invCard.classRestriction,
        interactive: this.deps.getSelectedActionSlot() !== null,
        onClick: () => this.deps.onInventoryCardClick(char, invCard),
      });
      panel.add(visual.container);
      this.inventoryCards.push(visual);
    }
  }
}
