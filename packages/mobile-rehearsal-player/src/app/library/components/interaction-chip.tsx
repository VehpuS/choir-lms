import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { appTheme } from '../../utils/theme';
import { INTERACTION_STATE_OPACITY } from './interaction-style-tokens';
import {
  resolveInteractionChipPalette,
  type InteractionChipVariant,
} from './interaction-chip-model';

type InteractionChipProps = {
  accessibilityLabel?: string;
  children?: ReactNode;
  disabled?: boolean;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  /** A glyph before the label (1j's selected tag chips). */
  leadingIcon?: ReactNode;
  onPress?: () => void;
  onPressIn?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: InteractionChipVariant;
};

export const InteractionChip = ({
  accessibilityLabel,
  children,
  disabled = false,
  label,
  labelStyle,
  leadingIcon,
  onPress,
  onPressIn,
  style,
  variant = 'passive',
}: InteractionChipProps) => {
  const palette = resolveInteractionChipPalette(variant);

  const content = (
    <>
      {leadingIcon}
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: palette.text,
            fontWeight: palette.isEmphasized
              ? appTheme.fontWeight.medium
              : appTheme.fontWeight.regular,
          },
          labelStyle,
        ]}
      >
        {label}
      </Text>
      {children ? <View style={styles.trailing}>{children}</View> : null}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={[
          styles.base,
          {
            backgroundColor: palette.background,
            borderColor: palette.border,
            opacity: disabled ? INTERACTION_STATE_OPACITY.disabled : 1,
          },
          style,
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor:
            pressed && !disabled
              ? palette.pressedBackground
              : palette.background,
          borderColor: palette.border,
          opacity: disabled
            ? INTERACTION_STATE_OPACITY.disabled
            : pressed
              ? INTERACTION_STATE_OPACITY.pressed
              : 1,
        },
        style,
      ]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: appTheme.space.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: appTheme.space.xs,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: appTheme.radius.pill,
  },
  label: {
    ...appTheme.type.chip,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
