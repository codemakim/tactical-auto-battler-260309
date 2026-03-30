export type TitleMenuAction = 'continue' | 'new_game' | 'start';

export interface TitleMenuButton {
  id: TitleMenuAction;
  label: string;
  style: 'primary' | 'secondary';
}

export function getTitleMenuButtons(hasSave: boolean): TitleMenuButton[] {
  if (!hasSave) {
    return [{ id: 'start', label: 'START', style: 'primary' }];
  }

  return [
    { id: 'continue', label: 'CONTINUE', style: 'primary' },
    { id: 'new_game', label: 'NEW GAME', style: 'secondary' },
  ];
}
