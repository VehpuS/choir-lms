import { Pressable, StyleSheet, Text } from 'react-native';

import { buttonInteractionGuardStyle } from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';

const { colors, space, type } = appTheme;

type RecordingMixLinkProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** A text action in the mix controls, such as `Normalize` or `Save as default`. */
export const RecordingMixLink = ({
  disabled = false,
  label,
  onPress,
}: RecordingMixLinkProps) => (
  <Pressable
    accessibilityLabel={label}
    accessibilityRole="button"
    accessibilityState={{ disabled }}
    disabled={disabled}
    hitSlop={space.xs}
    onPress={onPress}
    style={({ pressed }) => [
      styles.link,
      buttonInteractionGuardStyle,
      disabled || pressed ? styles.dimmed : null,
    ]}
  >
    <Text style={styles.label}>{label}</Text>
  </Pressable>
);

const styles = StyleSheet.create({
  dimmed: { opacity: 0.5 },
  label: {
    ...type.rowMeta,
    color: colors.accentText,
    textDecorationLine: 'underline',
  },
  link: { justifyContent: 'center', minHeight: space.touchTarget - space.md },
});
