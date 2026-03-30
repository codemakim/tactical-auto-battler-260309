import type { SaveDataStatus } from './SaveSystem';

export type TitleMenuAction = 'continue' | 'new_game' | 'start' | 'delete_save';

export interface TitleMenuButton {
  id: TitleMenuAction;
  label: string;
  style: 'primary' | 'secondary';
}

export function getTitleMenuButtons(saveStatus: SaveDataStatus): TitleMenuButton[] {
  if (saveStatus === 'empty') {
    return [{ id: 'start', label: 'START', style: 'primary' }];
  }

  if (saveStatus === 'corrupted') {
    return [
      { id: 'new_game', label: 'NEW GAME', style: 'primary' },
      { id: 'delete_save', label: 'DELETE SAVE', style: 'secondary' },
    ];
  }

  return [
    { id: 'continue', label: 'CONTINUE', style: 'primary' },
    { id: 'new_game', label: 'NEW GAME', style: 'secondary' },
    { id: 'delete_save', label: 'DELETE SAVE', style: 'secondary' },
  ];
}

export function getTitleMenuMessage(saveStatus: SaveDataStatus): string | null {
  if (saveStatus === 'valid') return 'Saved progress detected';
  if (saveStatus === 'corrupted') return 'Save data is corrupted. Start fresh or delete it.';
  return null;
}
