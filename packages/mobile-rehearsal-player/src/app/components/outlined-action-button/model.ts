import { appTheme } from '../../utils/theme';

const { colors } = appTheme;

/**
 * `accent` is the primary action, `neutral` its secondary, and `destructive`
 * an irreversible one. All three are outlines on a transparent fill: Nocturne
 * never floods a control with the accent (design Decision 8).
 */
export type OutlinedActionButtonVariant = 'accent' | 'destructive' | 'neutral';

type OutlinedActionButtonPalette = {
  border: string;
  label: string;
};

const OUTLINED_ACTION_BUTTON_PALETTES: Record<
  OutlinedActionButtonVariant,
  OutlinedActionButtonPalette
> = {
  accent: {
    border: colors.accent,
    label: colors.accentText,
  },
  destructive: {
    border: colors.dangerEdge,
    label: colors.danger,
  },
  neutral: {
    border: colors.borderButton,
    label: colors.text,
  },
};

export const OUTLINED_ACTION_BUTTON_MIN_HEIGHT = appTheme.space.touchTarget;
export const OUTLINED_ACTION_BUTTON_ICON_SIZE = 16;

export const resolveOutlinedActionButtonPalette = (
  variant: OutlinedActionButtonVariant,
): OutlinedActionButtonPalette => {
  return OUTLINED_ACTION_BUTTON_PALETTES[variant];
};

export const getOutlinedActionButtonVisualState = (options: {
  disabled: boolean;
  pressed: boolean;
}) => {
  return {
    disabled: options.disabled,
    pressed: options.pressed && !options.disabled,
  };
};
