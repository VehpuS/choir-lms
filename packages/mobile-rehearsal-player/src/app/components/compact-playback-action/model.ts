import { appTheme } from '../../utils/theme';

export type CompactPlaybackActionIconName = 'pause' | 'play' | 'replay';
export type CompactPlaybackActionVariant = 'inline' | 'card' | 'row' | 'chip';

export type CompactPlaybackActionVariantTokens = {
  borderRadius: number;
  disabledOpacity: number;
  height?: number;
  iconSize: number;
  minHeight?: number;
  minWidth?: number;
  paddingHorizontal?: number;
  pressedOpacity: number;
  width?: number;
};

export const COMPACT_PLAYBACK_ACTION_BACKGROUND =
  appTheme.colors.surfaceBackground;
export const COMPACT_PLAYBACK_ACTION_BORDER = appTheme.colors.border;
export const COMPACT_PLAYBACK_ACTION_DISABLED_ICON =
  appTheme.colors.secondaryText;
export const COMPACT_PLAYBACK_ACTION_HIT_SLOP = 4;
export const COMPACT_PLAYBACK_ACTION_ICON = appTheme.colors.primaryText;

const COMPACT_PLAYBACK_ACTION_VARIANT_TOKENS = {
  inline: {
    borderRadius: 999,
    disabledOpacity: 0.56,
    iconSize: 18,
    minHeight: 36,
    minWidth: 38,
    paddingHorizontal: 12,
    pressedOpacity: 0.88,
  },
  card: {
    borderRadius: 999,
    disabledOpacity: 0.56,
    iconSize: 18,
    minHeight: 36,
    minWidth: 44,
    paddingHorizontal: 12,
    pressedOpacity: 0.88,
  },
  row: {
    borderRadius: 20,
    disabledOpacity: 0.45,
    height: 40,
    iconSize: 22,
    pressedOpacity: 0.75,
    width: 40,
  },
  chip: {
    borderRadius: 16,
    disabledOpacity: 0.45,
    height: 32,
    iconSize: 16,
    pressedOpacity: 0.75,
    width: 32,
  },
} satisfies Record<
  CompactPlaybackActionVariant,
  CompactPlaybackActionVariantTokens
>;

export const getCompactPlaybackActionAccessibilityState = (options: {
  disabled: boolean;
  selected: boolean;
}) => {
  return {
    disabled: options.disabled,
    selected: options.selected,
  };
};

export const getCompactPlaybackActionVariantTokens = (
  variant: CompactPlaybackActionVariant,
) => {
  return COMPACT_PLAYBACK_ACTION_VARIANT_TOKENS[variant];
};

export const getCompactPlaybackActionVisualState = (options: {
  disabled: boolean;
  pressed: boolean;
}) => {
  return {
    disabled: options.disabled,
    pressed: options.pressed && !options.disabled,
  };
};
