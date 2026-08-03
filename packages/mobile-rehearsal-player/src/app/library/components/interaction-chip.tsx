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

import { INTERACTION_STATE_OPACITY } from './interaction-style-tokens';
import {
  resolveInteractionChipPalette,
  type InteractionChipVariant,
} from './interaction-chip-model';

type InteractionChipProps = {
  accessibilityLabel?: string;
  children?: ReactNode;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
  onPress?: () => void;
  onPressIn?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: InteractionChipVariant;
};

export const InteractionChip = ({
  accessibilityLabel,
  children,
  label,
  labelStyle,
  onPress,
  onPressIn,
  style,
  variant = 'passive',
}: InteractionChipProps) => {
  const palette = resolveInteractionChipPalette(variant);

  const content = (
    <>
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: palette.text,
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
      onPress={onPress}
      onPressIn={onPressIn}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: pressed
            ? palette.pressedBackground
            : palette.background,
          opacity: pressed ? INTERACTION_STATE_OPACITY.pressed : 1,
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
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
