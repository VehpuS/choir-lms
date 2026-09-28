import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../../utils/theme';
import { AppIcon, type AppIconName } from '../app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../interaction-guard';
import { INTERACTION_STATE_OPACITY } from '../../library/components/interaction-style-tokens';
import {
  OUTLINED_ACTION_BUTTON_ICON_SIZE,
  OUTLINED_ACTION_BUTTON_MIN_HEIGHT,
  getOutlinedActionButtonVisualState,
  resolveOutlinedActionButtonPalette,
  type OutlinedActionButtonVariant,
} from './model';

type OutlinedActionButtonProps = {
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Stretch to share a row equally with sibling actions (half-width pairs). */
  fill?: boolean;
  icon?: AppIconName;
  isBusy?: boolean;
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  variant?: OutlinedActionButtonVariant;
};

export const OutlinedActionButton = ({
  accessibilityLabel,
  disabled = false,
  fill = false,
  icon,
  isBusy = false,
  label,
  onPress,
  style,
  testID,
  variant = 'neutral',
}: OutlinedActionButtonProps) => {
  const palette = resolveOutlinedActionButtonPalette(variant);
  const isDisabled = disabled || isBusy;

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isBusy, disabled: isDisabled }}
      {...interactionGuardProps}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => {
        const visualState = getOutlinedActionButtonVisualState({
          disabled: isDisabled,
          pressed,
        });

        return [
          styles.button,
          { borderColor: palette.border },
          fill ? styles.fill : undefined,
          buttonInteractionGuardStyle,
          style,
          visualState.pressed ? styles.pressed : undefined,
          visualState.disabled && !isBusy ? styles.disabled : undefined,
        ];
      }}
      testID={testID}
    >
      {isBusy ? (
        <ActivityIndicator color={palette.label} size="small" />
      ) : icon ? (
        <AppIcon
          color={palette.label}
          name={icon}
          size={OUTLINED_ACTION_BUTTON_ICON_SIZE}
        />
      ) : null}
      <Text numberOfLines={1} style={[styles.label, { color: palette.label }]}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: OUTLINED_ACTION_BUTTON_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: appTheme.space.xs,
    paddingHorizontal: appTheme.space.lg,
    borderWidth: 1,
    borderRadius: appTheme.radius.md,
    backgroundColor: appTheme.colors.transparent,
  },
  disabled: {
    opacity: INTERACTION_STATE_OPACITY.disabled,
  },
  fill: {
    flex: 1,
  },
  label: {
    ...appTheme.type.button,
    flexShrink: 1,
  },
  pressed: {
    opacity: INTERACTION_STATE_OPACITY.pressed,
  },
});
