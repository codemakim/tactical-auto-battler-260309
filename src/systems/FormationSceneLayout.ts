import { HeroType, Position } from '../types';

export interface ZoneDef {
  key: 'BACK' | 'FRONT';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  position: Position;
  maxUnits: number;
}

export interface FormationSpriteConfig {
  texture: string;
  idleFrame: number;
  scale: number;
}

export const FORMATION_LAYOUT = {
  board: {
    x: 300,
    y: 110,
    width: 520,
    zoneHeight: 150,
    zoneGap: 18,
  },
  boardFrame: {
    x: 284,
    y: 78,
    width: 552,
    height: 352,
    radius: 14,
  },
  boardInner: {
    x: 294,
    y: 88,
    width: 532,
    height: 332,
    radius: 12,
  },
  boardGrid: {
    startX: 334,
    endY: 406,
    startY: 102,
    columns: 6,
    gap: 96,
    midlineY: 254,
    midlineStartX: 306,
    midlineEndX: 814,
  },
  rosterPanel: {
    x: 20,
    y: 65,
    width: 240,
  },
  rosterItem: {
    width: 224,
    height: 46,
    startX: 8,
    startY: 8,
    rowGap: 52,
    radius: 4,
  },
  unitCard: {
    width: 88,
    height: 102,
    radius: 6,
    spriteScaleMultiplier: 0.82,
  },
  hud: {
    x: 860,
    y: 78,
    width: 390,
    height: 472,
    radius: 14,
  },
  bottomButtons: {
    y: 652,
    backX: 20,
    commandX: 300,
    presetsX: 450,
    cardsX: 600,
    deployX: 1030,
  },
  overlays: {
    command: { width: 640, height: 280, cardWidth: 182, cardGap: 18 },
    preset: { width: 560, height: 240, slotButtonWidth: 150 },
    cardEditor: { width: 1080, height: 670, cardWidth: 188, cardHeight: 246, cardGap: 26 },
  },
} as const;

export const HERO_TYPES = [HeroType.COMMANDER, HeroType.MAGE, HeroType.SUPPORT] as const;

export const FORMATION_SPRITE_MAP: Record<string, FormationSpriteConfig> = {
  WARRIOR: { texture: 'warrior-attack', idleFrame: 0, scale: 0.16 },
  ASSASSIN: { texture: 'assassin-attack', idleFrame: 0, scale: 0.16 },
  ARCHER: { texture: 'archer-attack', idleFrame: 27, scale: 0.17 },
  GUARDIAN: { texture: 'guardian-attack', idleFrame: 0, scale: 0.18 },
  CONTROLLER: { texture: 'controller-attack', idleFrame: 0, scale: 0.17 },
};

export function getFormationZones(): ZoneDef[] {
  return [
    {
      key: 'BACK',
      x: FORMATION_LAYOUT.board.x,
      y: FORMATION_LAYOUT.board.y,
      width: FORMATION_LAYOUT.board.width,
      height: FORMATION_LAYOUT.board.zoneHeight,
      label: 'BACK (후열)',
      position: Position.BACK,
      maxUnits: 5,
    },
    {
      key: 'FRONT',
      x: FORMATION_LAYOUT.board.x,
      y: FORMATION_LAYOUT.board.y + FORMATION_LAYOUT.board.zoneHeight + FORMATION_LAYOUT.board.zoneGap,
      width: FORMATION_LAYOUT.board.width,
      height: FORMATION_LAYOUT.board.zoneHeight,
      label: 'FRONT (전열)',
      position: Position.FRONT,
      maxUnits: 5,
    },
  ];
}
