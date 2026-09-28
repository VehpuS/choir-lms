import { appTheme } from '../../utils/theme';

export type CompactPlaybackActionIconName =
  | 'pause'
  | 'play'
  | 'replay'
  | 'shuffle';
export type CompactPlaybackActionVariant = 'inline' | 'card' | 'row' | 'chip';

export type CompactPlaybackActionVariantTokens = {
  borderRadius: number;
  disabledOpacity: number;
  height?: number;
  hitSlop: number;
  iconSize: number;
  /** Outer spacing that pads a smaller visual ring out to a 44pt box. */
  margin?: number;
  minHeight?: number;
  minWidth?: number;
  paddingHorizontal?: number;
  pressedOpacity: number;
  width?: number;
};

// Per-row play control (screens 1a, 1b, 1j): a soft accent ring around a
// filled accent glyph, never an accent fill.
export const COMPACT_PLAYBACK_ACTION_BACKGROUND = appTheme.colors.transparent;
export const COMPACT_PLAYBACK_ACTION_BORDER = appTheme.colors.accentBorderSoft;
export const COMPACT_PLAYBACK_ACTION_DISABLED_ICON = appTheme.colors.textFaint;
export const COMPACT_PLAYBACK_ACTION_ICON = appTheme.colors.accent;

const TOUCH_TARGET = appTheme.space.touchTarget;
const ROW_RING_SIZE = 34;
const CHIP_RING_SIZE = 32;
const ROW_RING_OUTSET = (TOUCH_TARGET - ROW_RING_SIZE) / 2;
const CHIP_RING_OUTSET = (TOUCH_TARGET - CHIP_RING_SIZE) / 2;
const PRESSED_OPACITY = 0.8;
const DISABLED_OPACITY = 0.5;

const rowRingTokens = {
  borderRadius: ROW_RING_SIZE / 2,
  disabledOpacity: DISABLED_OPACITY,
  height: ROW_RING_SIZE,
  hitSlop: ROW_RING_OUTSET,
  iconSize: 16,
  margin: ROW_RING_OUTSET,
  pressedOpacity: PRESSED_OPACITY,
  width: ROW_RING_SIZE,
};

const COMPACT_PLAYBACK_ACTION_VARIANT_TOKENS = {
  inline: rowRingTokens,
  card: {
    borderRadius: appTheme.radius.pill,
    disabledOpacity: DISABLED_OPACITY,
    hitSlop: 0,
    iconSize: 18,
    minHeight: TOUCH_TARGET,
    minWidth: TOUCH_TARGET,
    paddingHorizontal: 12,
    pressedOpacity: PRESSED_OPACITY,
  },
  row: rowRingTokens,
  chip: {
    borderRadius: CHIP_RING_SIZE / 2,
    disabledOpacity: DISABLED_OPACITY,
    height: CHIP_RING_SIZE,
    hitSlop: CHIP_RING_OUTSET,
    iconSize: 14,
    pressedOpacity: PRESSED_OPACITY,
    width: CHIP_RING_SIZE,
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
