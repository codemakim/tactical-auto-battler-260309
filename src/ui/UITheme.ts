/**
 * 게임 전체 UI 테마 상수
 * 모든 UI 컴포넌트가 이 값들을 참조하여 일관성 유지
 */

export const UITheme = {
  // 색상 팔레트
  colors: {
    // 배경
    bgDark: 0x0f0f1a,
    bgPanel: 0x1a1a2e,
    bgPanelLight: 0x22223a,

    // 테두리
    border: 0x334466,
    borderLight: 0x4a6699,
    borderHighlight: 0x4a9eff,

    // 텍스트 (hex string)
    textPrimary: '#e0e0e0',
    textSecondary: '#8888aa',
    textAccent: '#4a9eff',
    textGold: '#ffcc00',
    textWarning: '#ff6644',
    textDisabled: '#555566',

    // 버튼
    btnPrimary: 0x2a4a7a,
    btnPrimaryHover: 0x3a5a9a,
    btnSecondary: 0x333344,
    btnSecondaryHover: 0x444466,
    btnDisabled: 0x222233,

    // 기능 색상
    gold: 0xffcc00,
    hp: 0x44cc44,
    shield: 0x4a9eff,
    danger: 0xff4444,
  },

  // 폰트
  font: {
    family: 'monospace',
    title: { fontSize: '32px', color: '#e0e0e0', fontFamily: 'monospace' } as Phaser.Types.GameObjects.Text.TextStyle,
    heading: { fontSize: '22px', color: '#e0e0e0', fontFamily: 'monospace' } as Phaser.Types.GameObjects.Text.TextStyle,
    body: { fontSize: '16px', color: '#e0e0e0', fontFamily: 'monospace' } as Phaser.Types.GameObjects.Text.TextStyle,
    small: { fontSize: '13px', color: '#8888aa', fontFamily: 'monospace' } as Phaser.Types.GameObjects.Text.TextStyle,
    label: { fontSize: '14px', color: '#8888aa', fontFamily: 'monospace' } as Phaser.Types.GameObjects.Text.TextStyle,
  },

  // 간격
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },

  // 패널
  panel: {
    borderWidth: 2,
    cornerRadius: 4,
    padding: 16,
  },
} as const;
