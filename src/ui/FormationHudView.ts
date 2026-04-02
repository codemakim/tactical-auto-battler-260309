import Phaser from 'phaser';
import { UITheme } from './UITheme';
import { FORMATION_LAYOUT } from '../systems/FormationSceneLayout';
import { drawRoundedFrame } from './FormationGraphics';
import { getFormationPanelLabels } from '../systems/FormationPresentation';
import { getFormationHeroHudText, getFormationSelectionHudCopy } from '../systems/FormationHudState';
import { UIActionMiniCard } from './UIActionMiniCard';
import type { ActionSlot, CharacterDefinition } from '../types';

export class FormationHudView {
  private readonly scene: Phaser.Scene;
  private heroText!: Phaser.GameObjects.Text;
  private unitMeta!: Phaser.GameObjects.Text;
  private unitEmptyText!: Phaser.GameObjects.Text;
  private actionCards: UIActionMiniCard[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    const labels = getFormationPanelLabels();
    const hud = FORMATION_LAYOUT.hud;

    const bg = this.scene.add.graphics();
    drawRoundedFrame(bg, hud.x, hud.y, hud.width, hud.height, hud.radius, {
      backgroundColor: 0x14192a,
      borderColor: 0x33486a,
      borderWidth: 2,
      alpha: 0.96,
    });

    this.scene.add
      .text(hud.x + 18, hud.y + 14, labels.command, {
        fontSize: '11px',
        fontFamily: UITheme.font.family,
        color: '#7f95bd',
      })
      .setOrigin(0, 0);

    this.heroText = this.scene.add.text(hud.x + 18, hud.y + 34, '', {
      fontSize: '18px',
      fontFamily: UITheme.font.family,
      color: UITheme.colors.textPrimary,
    });

    this.scene.add.text(hud.x + 18, hud.y + 116, labels.unit, {
      ...UITheme.font.label,
      color: '#7f95bd',
    });

    this.unitMeta = this.scene.add.text(hud.x + 18, hud.y + 144, '', {
      ...UITheme.font.small,
      color: UITheme.colors.textPrimary,
      wordWrap: { width: hud.width - 36 },
    });

    this.unitEmptyText = this.scene.add.text(hud.x + 18, hud.y + 250, '', {
      ...UITheme.font.small,
      color: '#9fb3d8',
      wordWrap: { width: hud.width - 36 },
    });
  }

  refreshHero(heroName: string | null, isLocked: boolean): void {
    this.heroText.setText(getFormationHeroHudText(heroName, isLocked));
  }

  refreshSelection(input: { character?: CharacterDefinition; zoneLabel?: string; actionSlots?: ActionSlot[] }): void {
    const copy = getFormationSelectionHudCopy(input);
    this.unitMeta.setText(copy.meta);
    this.actionCards.forEach((card) => card.destroy());
    this.actionCards = [];

    if (copy.actionSlots.length === 0) {
      this.unitEmptyText.setText(copy.emptyText ?? '');
      return;
    }

    this.unitEmptyText.setText('');
    const startX = FORMATION_LAYOUT.hud.x + 18;
    const startY = FORMATION_LAYOUT.hud.y + 250;
    const width = FORMATION_LAYOUT.hud.width - 36;
    copy.actionSlots.forEach((slot, index) => {
      const card = new UIActionMiniCard(this.scene, {
        x: startX,
        y: startY + index * 62,
        width,
        height: 56,
        action: slot.action,
        condition: slot.condition,
      });
      this.actionCards.push(card);
    });
  }
}
