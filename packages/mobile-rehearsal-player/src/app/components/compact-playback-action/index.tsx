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
  COMPACT_PLAYBACK_ACTION_BACKGROUND,
  COMPACT_PLAYBACK_ACTION_BORDER,
  COMPACT_PLAYBACK_ACTION_DISABLED_ICON,
  COMPACT_PLAYBACK_ACTION_ICON,
  getCompactPlaybackActionAccessibilityState,
  getCompactPlaybackActionVariantTokens,
  getCompactPlaybackActionVisualState,
  type CompactPlaybackActionIconName,
  type CompactPlaybackActionVariantTokens,
  type CompactPlaybackActionVariant,
} from './model';
import { AppIcon } from '../app-icon';

type CompactPlaybackActionProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  disabledIconColor?: string;
  iconColor?: string;
  iconName: CompactPlaybackActionIconName;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: CompactPlaybackActionVariant;
};

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COMPACT_PLAYBACK_ACTION_BORDER,
    backgroundColor: COMPACT_PLAYBACK_ACTION_BACKGROUND,
  },
});

const toVariantStyle = (tokens: CompactPlaybackActionVariantTokens) => {
  return {
    borderRadius: tokens.borderRadius,
    height: tokens.height,
    margin: tokens.margin,
    minHeight: tokens.minHeight,
    minWidth: tokens.minWidth,
    paddingHorizontal: tokens.paddingHorizontal,
    width: tokens.width,
  };
};

export const CompactPlaybackAction = ({
  accessibilityLabel,
  disabled = false,
  disabledIconColor = COMPACT_PLAYBACK_ACTION_DISABLED_ICON,
  iconColor = COMPACT_PLAYBACK_ACTION_ICON,
  iconName,
  onPress,
  selected = false,
  style,
  testID,
  variant = 'inline',
}: CompactPlaybackActionProps) => {
  const tokens = getCompactPlaybackActionVariantTokens(variant);

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={getCompactPlaybackActionAccessibilityState({
        disabled,
        selected,
      })}
      {...interactionGuardProps}
      disabled={disabled}
      hitSlop={tokens.hitSlop}
      onPress={onPress}
      style={({ pressed }) => {
        const visualState = getCompactPlaybackActionVisualState({
          disabled,
          pressed,
        });

        return [
          styles.action,
          toVariantStyle(tokens),
          buttonInteractionGuardStyle,
          style,
          visualState.pressed ? { opacity: tokens.pressedOpacity } : undefined,
          visualState.disabled
            ? { opacity: tokens.disabledOpacity }
            : undefined,
        ];
      }}
      testID={testID}
    >
      <AppIcon
        color={disabled ? disabledIconColor : iconColor}
        name={iconName}
        size={tokens.iconSize}
      />
    </Pressable>
  );
};
