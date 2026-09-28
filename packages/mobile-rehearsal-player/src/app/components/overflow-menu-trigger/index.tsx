import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../interaction-guard';
import {
  OVERFLOW_MENU_TRIGGER_HIT_SLOP,
  OVERFLOW_MENU_TRIGGER_ICON_SIZE,
  OVERFLOW_MENU_TRIGGER_MIN_HEIGHT,
  OVERFLOW_MENU_TRIGGER_MIN_WIDTH,
  OVERFLOW_MENU_TRIGGER_RIGHT,
  OVERFLOW_MENU_TRIGGER_TOP,
  getOverflowMenuTriggerAccessibilityState,
  getOverflowMenuTriggerVisualState,
} from './model';

import { AppIcon } from '../app-icon';
import { appTheme } from '../../utils/theme';

type OverflowMenuTriggerProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  iconColor?: string;
  iconSize?: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    top: OVERFLOW_MENU_TRIGGER_TOP,
    right: OVERFLOW_MENU_TRIGGER_RIGHT,
    zIndex: 1,
    minWidth: OVERFLOW_MENU_TRIGGER_MIN_WIDTH,
    minHeight: OVERFLOW_MENU_TRIGGER_MIN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: appTheme.radius.pill,
  },
  pressed: {
    backgroundColor: appTheme.colors.hairline,
  },
  disabled: {
    opacity: 0.56,
  },
});

export const OverflowMenuTrigger = ({
  accessibilityLabel,
  disabled = false,
  iconColor = appTheme.colors.icon,
  iconSize = OVERFLOW_MENU_TRIGGER_ICON_SIZE,
  onPress,
  style,
  testID,
}: OverflowMenuTriggerProps) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={getOverflowMenuTriggerAccessibilityState(disabled)}
      {...interactionGuardProps}
      disabled={disabled}
      hitSlop={OVERFLOW_MENU_TRIGGER_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => {
        const visualState = getOverflowMenuTriggerVisualState({
          disabled,
          pressed,
        });

        return [
          styles.trigger,
          buttonInteractionGuardStyle,
          style,
          visualState.pressed ? styles.pressed : undefined,
          visualState.disabled ? styles.disabled : undefined,
        ];
      }}
      testID={testID}
    >
      <AppIcon color={iconColor} name="dots-vertical" size={iconSize} />
    </Pressable>
  );
};
