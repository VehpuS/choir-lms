import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AppIcon, type AppIconName } from './app-icon';
import { appTheme } from '../utils/theme';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from './interaction-guard';

export type SurfaceIconButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: AppIconName;
  onPress: () => void;
  selected?: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
  tone?: 'primary' | 'secondary';
};

export const SurfaceIconButton = ({
  accessibilityLabel,
  disabled = false,
  icon,
  onPress,
  selected = false,
  size = 22,
  style,
  tone = 'secondary',
}: SurfaceIconButtonProps) => {
  const isPrimary = tone === 'primary';

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        disabled,
        selected,
      }}
      {...interactionGuardProps}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        isPrimary ? styles.primaryButton : styles.secondaryButton,
        buttonInteractionGuardStyle,
        style,
        pressed && !disabled ? styles.pressedButton : null,
        disabled ? styles.disabledButton : null,
      ]}
    >
      <AppIcon
        color={isPrimary ? appTheme.colors.accentOnTint : appTheme.colors.icon}
        name={icon}
        size={size}
      />
    </Pressable>
  );
};

// Primary is the accent ring with an ambient glow (transport play / pause,
// the Files create FAB); its fill is the dark accent tint so it stays opaque
// over scrolling content. Secondary is a 44pt neutral-outlined circle.
const PRIMARY_SIZE = 70;
const PRIMARY_RING_WIDTH = 1.5;

const styles = StyleSheet.create({
  primaryButton: {
    width: PRIMARY_SIZE,
    height: PRIMARY_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: PRIMARY_RING_WIDTH,
    borderColor: appTheme.colors.accent,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.surfaceAccent,
    shadowColor: appTheme.colors.accent,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  secondaryButton: {
    width: appTheme.space.touchTarget,
    height: appTheme.space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.borderButton,
    borderRadius: appTheme.radius.pill,
    backgroundColor: appTheme.colors.transparent,
  },
  pressedButton: {
    opacity: 0.8,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
