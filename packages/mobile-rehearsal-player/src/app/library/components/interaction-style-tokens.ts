import { appTheme } from '../../utils/theme';

const { colors } = appTheme;

export const INTERACTION_STATE_OPACITY = {
  disabled: 0.56,
  pressed: 0.88,
} as const;

export const INTERACTION_CARD_SHELL_TOKENS = {
  borderColor: colors.border,
  mutedBackground: colors.surface,
  surfaceBackground: colors.bg,
} as const;

export const INTERACTION_ACTION_BUTTON_TOKENS = {
  destructive: {
    background: colors.dangerFill,
    text: colors.danger,
  },
  primary: {
    background: colors.surfaceAccent,
    text: colors.accentOnTint,
  },
  secondary: {
    background: colors.surface,
    text: colors.text,
  },
} as const;

export const INTERACTION_CHIP_TOKENS = {
  actionText: colors.accentText,
  passiveBackground: colors.surface,
  passivePressedBackground: colors.neutral[700],
  passiveText: colors.textSecondary,
  selectedBackground: colors.surfaceAccent,
  selectedText: colors.accentOnTint,
} as const;
