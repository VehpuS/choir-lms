import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  COMPACT_PLAYBACK_ACTION_BACKGROUND,
  COMPACT_PLAYBACK_ACTION_BORDER,
  COMPACT_PLAYBACK_ACTION_DISABLED_ICON,
  COMPACT_PLAYBACK_ACTION_HIT_SLOP,
  COMPACT_PLAYBACK_ACTION_ICON,
  getCompactPlaybackActionAccessibilityState,
  getCompactPlaybackActionVariantTokens,
  getCompactPlaybackActionVisualState,
  type CompactPlaybackActionIconName,
  type CompactPlaybackActionVariant,
} from './model';

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
  inline: {
    minWidth: 38,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  card: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  row: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  chip: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
});

const getVariantStyle = (variant: CompactPlaybackActionVariant) => {
  switch (variant) {
    case 'card':
      return styles.card;
    case 'row':
      return styles.row;
    case 'chip':
      return styles.chip;
    default:
      return styles.inline;
  }
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
      disabled={disabled}
      hitSlop={COMPACT_PLAYBACK_ACTION_HIT_SLOP}
      onPress={onPress}
      style={({ pressed }) => {
        const visualState = getCompactPlaybackActionVisualState({
          disabled,
          pressed,
        });

        return [
          styles.action,
          getVariantStyle(variant),
          style,
          visualState.pressed ? { opacity: tokens.pressedOpacity } : undefined,
          visualState.disabled
            ? { opacity: tokens.disabledOpacity }
            : undefined,
        ];
      }}
      testID={testID}
    >
      <MaterialCommunityIcons
        color={disabled ? disabledIconColor : iconColor}
        name={iconName}
        size={tokens.iconSize}
      />
    </Pressable>
  );
};
