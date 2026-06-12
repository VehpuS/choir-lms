export const OVERFLOW_MENU_TRIGGER_BACKGROUND = '#fffdf8';
export const OVERFLOW_MENU_TRIGGER_BORDER = '#d6d1c4';
export const OVERFLOW_MENU_TRIGGER_HIT_SLOP = 4;
export const OVERFLOW_MENU_TRIGGER_ICON_SIZE = 18;
export const OVERFLOW_MENU_TRIGGER_MIN_HEIGHT = 36;
export const OVERFLOW_MENU_TRIGGER_MIN_WIDTH = 44;
export const OVERFLOW_MENU_TRIGGER_PADDING_HORIZONTAL = 12;
export const OVERFLOW_MENU_TRIGGER_TOP = 10;
export const OVERFLOW_MENU_TRIGGER_RIGHT = 10;

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
