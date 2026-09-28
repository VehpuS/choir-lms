import { appTheme } from '../../utils/theme';

// A bare glyph in a 44pt box (screen 1b row anatomy): the overflow trigger
// carries no outline or fill so it recedes behind the row's play ring.
export const OVERFLOW_MENU_TRIGGER_HIT_SLOP = 0;
export const OVERFLOW_MENU_TRIGGER_ICON_SIZE = 20;
export const OVERFLOW_MENU_TRIGGER_MIN_HEIGHT = appTheme.space.touchTarget;
export const OVERFLOW_MENU_TRIGGER_MIN_WIDTH = appTheme.space.touchTarget;
export const OVERFLOW_MENU_TRIGGER_TOP = 4;
export const OVERFLOW_MENU_TRIGGER_RIGHT = 4;

export const getOverflowMenuTriggerAccessibilityState = (disabled: boolean) => {
  return {
    disabled,
  };
};

export const getOverflowMenuTriggerVisualState = (options: {
  disabled: boolean;
  pressed: boolean;
}) => {
  return {
    disabled: options.disabled,
    pressed: options.pressed && !options.disabled,
  };
};
