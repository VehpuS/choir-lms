export const INTERACTION_STATE_OPACITY = {
  disabled: 0.56,
  pressed: 0.88,
} as const;

export const INTERACTION_CARD_SHELL_TOKENS = {
  borderColor: '#d6d1c4',
  mutedBackground: '#faf6ee',
  surfaceBackground: '#fffdf8',
} as const;

export const INTERACTION_ACTION_BUTTON_TOKENS = {
  destructive: {
    background: '#fff1ed',
    text: '#8a2d1f',
  },
  primary: {
    background: '#305c4d',
    text: '#fff8ef',
  },
  secondary: {
    background: '#f2ece1',
    text: '#1f1c17',
  },
} as const;

export const INTERACTION_CHIP_TOKENS = {
  actionText: '#2f5a4b',
  passiveBackground: '#f2ece1',
  passivePressedBackground: '#e3dac9',
  passiveText: '#5f5647',
  selectedBackground: '#173229',
  selectedText: '#fff8ef',
} as const;
