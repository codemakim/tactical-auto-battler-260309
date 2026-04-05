import Phaser from 'phaser';
import { GAME_HEIGHT } from '../config/GameConfig';
import { UITheme } from './UITheme';
import { UIPanel } from './UIPanel';
import { FORMATION_LAYOUT } from '../systems/FormationSceneLayout';
import { getRosterItemVisualState } from '../systems/FormationSceneStyles';
import { drawRoundedFrame } from './FormationGraphics';
import { buildFormationRosterEntries } from '../systems/FormationRosterState';
import { getFormationPanelLabels } from '../systems/FormationPresentation';
import type { CharacterDefinition } from '../types';

export class FormationRosterView {
  private readonly scene: Phaser.Scene;
  private readonly deps: {
    getCharacters: () => CharacterDefinition[];
    getFormationIds: () => Set<string>;
    getSelectedCharacterId: () => string | null;
    onSelect: (char: CharacterDefinition) => void;
    onPress: (char: CharacterDefinition, pointer: Phaser.Input.Pointer) => void;
  };
  private readonly items: Phaser.GameObjects.Container[] = [];
  private readonly itemBounds = new Map<string, Phaser.Geom.Rectangle>();
  private panel!: UIPanel;

  constructor(
    scene: Phaser.Scene,
    deps: {
      getCharacters: () => CharacterDefinition[];
      getFormationIds: () => Set<string>;
      getSelectedCharacterId: () => string | null;
      onSelect: (char: CharacterDefinition) => void;
      onPress: (char: CharacterDefinition, pointer: Phaser.Input.Pointer) => void;
    },
  ) {
    this.scene = scene;
    this.deps = deps;
  }

  create(): void {
    const labels = getFormationPanelLabels();
    this.panel = new UIPanel(this.scene, {
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

  refresh(): void {
    for (const item of this.items) item.destroy();
    this.items.length = 0;
    this.itemBounds.clear();

    const entries = buildFormationRosterEntries(
      this.deps.getCharacters(),
      this.deps.getFormationIds(),
      this.deps.getSelectedCharacterId(),
    );
    const startY = this.panel.contentY + FORMATION_LAYOUT.rosterItem.startY;

    entries.forEach((entry, index) => {
      const item = this.createRosterItem(
        entry.character,
        entry.isAssigned,
        entry.isSelected,
        FORMATION_LAYOUT.rosterItem.startX,
        startY + index * FORMATION_LAYOUT.rosterItem.rowGap,
      );
      this.itemBounds.set(
        entry.character.id,
        new Phaser.Geom.Rectangle(
          this.panel.container.x + FORMATION_LAYOUT.rosterItem.startX,
          this.panel.container.y + startY + index * FORMATION_LAYOUT.rosterItem.rowGap,
          FORMATION_LAYOUT.rosterItem.width,
          FORMATION_LAYOUT.rosterItem.height,
        ),
      );
      this.panel.add(item);
      this.items.push(item);
    });
  }

  containsPoint(worldX: number, worldY: number): boolean {
    const rect = new Phaser.Geom.Rectangle(
      this.panel.container.x,
      this.panel.container.y,
      FORMATION_LAYOUT.rosterPanel.width,
      GAME_HEIGHT - 130,
    );
    return rect.contains(worldX, worldY);
  }

  private createRosterItem(
    char: CharacterDefinition,
    isAssigned: boolean,
    isSelected: boolean,
    x: number,
    y: number,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const w = FORMATION_LAYOUT.rosterItem.width;
    const h = FORMATION_LAYOUT.rosterItem.height;

    const bg = this.scene.add.graphics();
    const baseState = getRosterItemVisualState({ isSelected, isAssigned });
    drawRoundedFrame(bg, 0, 0, w, h, FORMATION_LAYOUT.rosterItem.radius, baseState);
    container.add(bg);

    container.add(
      this.scene.add
        .text(8, 6, char.characterClass.substring(0, 3), {
          ...UITheme.font.small,
          color: '#6688aa',
        })
        .setFontSize(11),
    );

    container.add(
      this.scene.add.text(8, 22, char.name, {
        ...UITheme.font.label,
        color: isAssigned ? UITheme.colors.textAccent : UITheme.colors.textPrimary,
      }),
    );

    const stats = char.baseStats;
    container.add(
      this.scene.add
        .text(w - 8, 14, `HP${stats.hp} A${stats.atk} G${stats.grd} S${stats.agi}`, {
          ...UITheme.font.small,
          color: '#666688',
        })
        .setOrigin(1, 0)
        .setFontSize(10),
    );

    if (isAssigned) {
      container.add(
        this.scene.add
          .text(w - 8, 32, '편성됨', { ...UITheme.font.small, color: '#4488cc' })
          .setOrigin(1, 0)
          .setFontSize(10),
      );
    }

    const hitArea = this.scene.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
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

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.deps.onPress(char, pointer));
    return container;
  }
}
