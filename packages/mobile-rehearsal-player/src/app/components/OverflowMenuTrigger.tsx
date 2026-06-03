import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  OVERFLOW_MENU_TRIGGER_BACKGROUND,
  OVERFLOW_MENU_TRIGGER_BORDER,
  OVERFLOW_MENU_TRIGGER_HIT_SLOP,
  OVERFLOW_MENU_TRIGGER_ICON_SIZE,
  OVERFLOW_MENU_TRIGGER_MIN_HEIGHT,
  OVERFLOW_MENU_TRIGGER_MIN_WIDTH,
  OVERFLOW_MENU_TRIGGER_PADDING_HORIZONTAL,
  OVERFLOW_MENU_TRIGGER_RIGHT,
  OVERFLOW_MENU_TRIGGER_TOP,
  getOverflowMenuTriggerAccessibilityState,
  getOverflowMenuTriggerVisualState,
} from './overflow-menu-trigger-model';

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
    paddingHorizontal: OVERFLOW_MENU_TRIGGER_PADDING_HORIZONTAL,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: OVERFLOW_MENU_TRIGGER_BORDER,
    borderRadius: 999,
    backgroundColor: OVERFLOW_MENU_TRIGGER_BACKGROUND,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.56,
  },
});

export const OverflowMenuTrigger = ({
  accessibilityLabel,
  disabled = false,
  iconColor = '#1f1c17',
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
          style,
          visualState.pressed ? styles.pressed : undefined,
          visualState.disabled ? styles.disabled : undefined,
        ];
      }}
      testID={testID}
    >
      <MaterialCommunityIcons
        color={iconColor}
        name="dots-vertical"
        size={iconSize}
      />
    </Pressable>
  );
};
