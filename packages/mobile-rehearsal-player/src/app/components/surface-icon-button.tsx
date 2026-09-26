import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../utils/theme';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from './interaction-guard';

export type SurfaceIconButtonProps = {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
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
      <MaterialCommunityIcons
        color={
          isPrimary ? appTheme.colors.accentOnTint : appTheme.colors.primaryText
        }
        name={icon}
        size={size}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.accent,
    borderRadius: 999,
    backgroundColor: appTheme.colors.surfaceAccent,
  },
  secondaryButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 999,
    backgroundColor: appTheme.colors.surface,
  },
  pressedButton: {
    opacity: 0.84,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
