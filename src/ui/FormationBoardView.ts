import Phaser from 'phaser';
import { UITheme } from './UITheme';
import { calculateRowLayout } from '../systems/UnitLayoutCalculator';
import { getFormationLanePresentation } from '../systems/FormationPresentation';
import {
  FORMATION_LAYOUT,
  FORMATION_SPRITE_MAP,
  getFormationZones,
  type ZoneDef,
} from '../systems/FormationSceneLayout';
import { getUnitCardVisualState } from '../systems/FormationSceneStyles';
import { drawHorizontalDivider, drawRoundedFrame } from './FormationGraphics';
import type { CharacterDefinition } from '../types';
import { getBoardSlotMarkerStates } from '../systems/FormationBoardState';

const ZONES = getFormationZones();

export class FormationBoardView {
  private readonly scene: Phaser.Scene;
  private readonly deps: {
    getCharactersInZone: (zoneKey: 'FRONT' | 'BACK') => CharacterDefinition[];
    onZoneClick: (zone: ZoneDef) => void;
    onUnitSelect: (char: CharacterDefinition) => void;
    onRemoveUnit: (charId: string) => void;
  };
  private readonly zoneContainers = new Map<string, Phaser.GameObjects.Container>();
  private readonly zoneUnitVisuals: Phaser.GameObjects.Container[] = [];

  constructor(
    scene: Phaser.Scene,
    deps: {
      getCharactersInZone: (zoneKey: 'FRONT' | 'BACK') => CharacterDefinition[];
      onZoneClick: (zone: ZoneDef) => void;
      onUnitSelect: (char: CharacterDefinition) => void;
      onRemoveUnit: (charId: string) => void;
    },
  ) {
    this.scene = scene;
    this.deps = deps;
  }

  create(): void {
    this.scene.add
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

  refresh(): void {
    for (const visual of this.zoneUnitVisuals) visual.destroy();
    this.zoneUnitVisuals.length = 0;

    for (const zone of ZONES) {
      const container = this.zoneContainers.get(zone.key);
      if (!container) continue;

      const emptyText = container.getData('emptyText') as Phaser.GameObjects.Text;
      const slotMarkers = container.getData('slotMarkers') as Phaser.GameObjects.Graphics[];
      const charsInZone = this.deps.getCharactersInZone(zone.key);
      const markerStates = getBoardSlotMarkerStates(zone.maxUnits, charsInZone.length);
      slotMarkers.forEach((marker, index) => marker.setVisible(markerStates[index]));
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

  private createZoneVisual(zone: ZoneDef): void {
    const container = this.scene.add.container(zone.x, zone.y);
    const lane = getFormationLanePresentation(zone.key);

    const bg = this.scene.add.graphics();
    drawRoundedFrame(bg, 0, 0, zone.width, zone.height, 12, {
      backgroundColor: lane.glowColor,
      borderColor: lane.accentColor,
      borderWidth: 2,
      alpha: 0.45,
    });
    drawHorizontalDivider(bg, 14, 44, zone.width - 14, 0xffffff, 0.06);
    container.add(bg);

    const slotMarkers: Phaser.GameObjects.Graphics[] = [];
    for (let i = 0; i < zone.maxUnits; i++) {
      const slotX = 28 + i * ((zone.width - 56) / (zone.maxUnits - 1));
      const marker = this.scene.add.graphics();
      drawRoundedFrame(marker, slotX - 36, 56, 72, 88, 10, {
        backgroundColor: 0x101522,
        borderColor: lane.accentColor,
        borderWidth: 1,
        alpha: 0.34,
      });
      container.add(marker);
      slotMarkers.push(marker);
    }
    container.setData('slotMarkers', slotMarkers);

    container.add(
      this.scene.add
        .text(18, 14, lane.title, {
          fontSize: '18px',
          fontFamily: UITheme.font.family,
          color: `#${lane.accentColor.toString(16).padStart(6, '0')}`,
        })
        .setOrigin(0, 0),
    );

    container.add(
      this.scene.add
        .text(zone.width - 18, 18, lane.caption, { ...UITheme.font.small, color: '#7d8fb0' })
        .setOrigin(1, 0)
        .setFontSize(10),
    );

    const emptyText = this.scene.add
      .text(zone.width / 2, zone.height / 2 + 6, 'EMPTY', {
        ...UITheme.font.small,
        color: '#334455',
        align: 'center',
      })
      .setOrigin(0.5)
      .setFontSize(12);
    container.add(emptyText);
    container.setData('emptyText', emptyText);

    const hitArea = this.scene.add
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

    hitArea.on('pointerdown', () => this.deps.onZoneClick(zone));
    this.zoneContainers.set(zone.key, container);
  }

  private createUnitInZone(
    char: CharacterDefinition,
    x: number,
    y: number,
    zone: ZoneDef,
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const w = FORMATION_LAYOUT.unitCard.width;
    const h = FORMATION_LAYOUT.unitCard.height;

    const bg = this.scene.add.graphics();
    drawRoundedFrame(bg, -w / 2, -h / 2, w, h, FORMATION_LAYOUT.unitCard.radius, getUnitCardVisualState(false));
    container.add(bg);

    container.add(
      this.scene.add
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
        this.scene.add
          .sprite(0, -8, spriteInfo.texture, spriteInfo.idleFrame)
          .setScale(spriteInfo.scale * FORMATION_LAYOUT.unitCard.spriteScaleMultiplier)
          .setOrigin(0.5, 0.5),
      );
    }

    const nameText = this.scene.add
      .text(0, 20, char.name, { ...UITheme.font.label, color: UITheme.colors.textPrimary })
      .setOrigin(0.5);
    nameText.setFontSize(10);
    container.add(nameText);

    const stats = char.baseStats;
    container.add(
      this.scene.add
        .text(0, 35, `HP${stats.hp} A${stats.atk}`, { ...UITheme.font.small, color: '#666688' })
        .setOrigin(0.5)
        .setFontSize(8),
    );

    const removeBtn = this.scene.add
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
      this.deps.onRemoveUnit(char.id);
    });

    const hitArea = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      pointer.event.stopPropagation();
      this.deps.onUnitSelect(char);
    });

    hitArea.on('pointerover', () => {
      drawRoundedFrame(bg, -w / 2, -h / 2, w, h, FORMATION_LAYOUT.unitCard.radius, getUnitCardVisualState(true));
    });

    hitArea.on('pointerout', () => {
      drawRoundedFrame(bg, -w / 2, -h / 2, w, h, FORMATION_LAYOUT.unitCard.radius, getUnitCardVisualState(false));
    });

    return container;
  }
}
