import { UITheme } from '../ui/UITheme';

export interface FormationVisualState {
  backgroundColor: number;
  borderColor: number;
  borderWidth: number;
  alpha?: number;
}

export function getRosterItemVisualState(input: { isSelected: boolean; isAssigned: boolean }): FormationVisualState {
  if (input.isSelected) {
    return {
      backgroundColor: 0x2a3a4a,
      borderColor: 0xffcc00,
      borderWidth: 2,
      alpha: 0.9,
    };
  }

  if (input.isAssigned) {
    return {
      backgroundColor: 0x1a2a3a,
      borderColor: 0x3b82f6,
      borderWidth: 1,
      alpha: 0.9,
    };
  }

  return {
    backgroundColor: UITheme.colors.bgPanel,
    borderColor: UITheme.colors.border,
    borderWidth: 1,
    alpha: 0.9,
  };
}

export function getUnitCardVisualState(isHovered: boolean): FormationVisualState {
  if (isHovered) {
    return {
      backgroundColor: 0x2a3a5a,
      borderColor: 0xffcc00,
      borderWidth: 2,
      alpha: 0.95,
    };
  }

  return {
    backgroundColor: 0x1e2844,
    borderColor: UITheme.colors.border,
    borderWidth: 1,
    alpha: 0.9,
  };
}

export function getCommandCardVisualState(isSelected: boolean): FormationVisualState {
  return isSelected
    ? {
        backgroundColor: 0x203d31,
        borderColor: 0x10b981,
        borderWidth: 2,
        alpha: 0.96,
      }
    : {
        backgroundColor: 0x181d2d,
        borderColor: 0x344866,
        borderWidth: 2,
        alpha: 0.96,
      };
}
