import type { ActionEffect } from '../types';

const MONO_EFFECT_ICONS: Record<ActionEffect['type'], string> = {
  DAMAGE: '✦',
  HEAL: '✚',
  SHIELD: '◈',
  MOVE: '△',
  PUSH: '▷',
  BUFF: '▲',
  DEBUFF: '▼',
  DELAY_TURN: '◷',
  ADVANCE_TURN: '◶',
  REPOSITION: '◇',
  DELAYED: '◌',
  SWAP: '⇄',
};

export function getMonoEffectIcon(type: ActionEffect['type']): string {
  return MONO_EFFECT_ICONS[type] ?? '?';
}
