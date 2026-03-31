import type { SaveDataStatus } from './SaveSystem';

export type TitleMenuAction = 'continue' | 'new_game' | 'start' | 'delete_save';

export interface TitleMenuSavePreview {
  hasActiveRun: boolean;
  currentStage?: number;
  maxStages?: number;
  gold: number;
  rosterSize: number;
}

export interface TitleMenuButton {
  id: TitleMenuAction;
  label: string;
  style: 'primary' | 'secondary';
}

export interface TitleMenuStatusPanel {
  title: string;
  body: string;
  footer: string;
  accentColor: string;
}

export function getTitleMenuButtons(saveStatus: SaveDataStatus, hasActiveRun = false): TitleMenuButton[] {
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
    { id: 'continue', label: hasActiveRun ? 'RESUME RUN' : 'CONTINUE', style: 'primary' },
    { id: 'new_game', label: 'NEW GAME', style: 'secondary' },
    { id: 'delete_save', label: 'DELETE SAVE', style: 'secondary' },
  ];
}

export function getTitleMenuMessage(saveStatus: SaveDataStatus, preview?: TitleMenuSavePreview): string | null {
  if (saveStatus === 'valid' && preview?.hasActiveRun && preview.currentStage && preview.maxStages) {
    return `Operation live · Stage ${preview.currentStage} / ${preview.maxStages}`;
  }

  if (saveStatus === 'valid') return 'Archive synchronized';
  if (saveStatus === 'corrupted') return 'Signal lost';
  return null;
}

export function getContinueTargetScene(hasActiveRun: boolean): 'TownScene' | 'RunMapScene' {
  return hasActiveRun ? 'RunMapScene' : 'TownScene';
}

export function getTitleMenuStatusPanel(
  saveStatus: SaveDataStatus,
  preview?: TitleMenuSavePreview,
): TitleMenuStatusPanel | null {
  if (saveStatus === 'corrupted') {
    return {
      title: 'SIGNAL LOST',
      body: 'Save data unreadable',
      footer: 'Start fresh or delete the archive.',
      accentColor: '#ff6644',
    };
  }

  if (saveStatus !== 'valid' || !preview) return null;

  if (preview.hasActiveRun && preview.currentStage && preview.maxStages) {
    return {
      title: 'OPERATION LIVE',
      body: `Stage ${preview.currentStage} / ${preview.maxStages}  ·  ${preview.gold} GOLD`,
      footer: 'Resume returns to the Run Map.',
      accentColor: '#ffcc66',
    };
  }

  return {
    title: 'ARCHIVE READY',
    body: `${preview.gold} GOLD  ·  Roster ${preview.rosterSize}`,
    footer: 'Continue returns to Town.',
    accentColor: '#4a9eff',
  };
}
