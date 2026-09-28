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

// Chips are outlines on the ground (screens 1b, 1j). Only a chosen tag is a
// filled chip, so it reads as a token the user added rather than a toggle.
export const INTERACTION_CHIP_TOKENS = {
  actionText: colors.accentText,
  passiveBorder: colors.borderChip,
  passivePressedBackground: colors.neutral[700],
  passiveText: colors.textSecondary,
  selectedBorder: colors.accent,
  selectedText: colors.accentText,
  tagBackground: colors.surfaceAccent,
  tagText: colors.accentOnTint,
  transparent: colors.transparent,
} as const;
