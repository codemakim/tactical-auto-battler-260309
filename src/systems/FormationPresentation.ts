export interface FormationPanelLabels {
  roster: string;
  command: string;
  unit: string;
  presets: string;
  cards: string;
  deploy: string;
}

export interface FormationLanePresentation {
  title: string;
  caption: string;
  accentColor: number;
  glowColor: number;
}

export function getFormationPanelLabels(): FormationPanelLabels {
  return {
    roster: 'ROSTER',
    command: 'COMMAND',
    unit: 'UNIT',
    presets: 'PRESETS',
    cards: 'TACTICS',
    deploy: 'DEPLOY',
  };
}

export function getFormationLanePresentation(zone: 'BACK' | 'FRONT'): FormationLanePresentation {
  if (zone === 'BACK') {
    return {
      title: 'BACKLINE',
      caption: 'RANGED / CONTROL',
      accentColor: 0x4a9eff,
      glowColor: 0x18314d,
    };
  }

  return {
    title: 'FRONTLINE',
    caption: 'VANGUARD / TANK',
    accentColor: 0xffb347,
    glowColor: 0x3f2b16,
  };
}
