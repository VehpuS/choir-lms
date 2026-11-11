import { Pressable, StyleSheet, Text } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { appTheme } from '../../../../utils/theme';

const { colors, radius, space } = appTheme;
const ICON_SIZE = 16;
const CHIP_BOTTOM_GAP = 10;

/** What the full-screen piano shows of the track that keeps playing. */
export type PianoPlayingChip = {
  isPlaying: boolean;
  onToggle: () => void;
  title: string;
  toggleLabel: string;
};

/**
 * A small floating chip with the playing title and a pause (or play) control,
 * so a singer can stop the track without leaving full screen.
 */
export const PianoPlayingChipView = ({ chip }: { chip: PianoPlayingChip }) => (
  <Pressable
    accessibilityLabel={chip.toggleLabel}
    accessibilityRole="button"
    onPress={chip.onToggle}
    style={styles.chip}
    testID="piano-playing-chip"
  >
    <AppIcon
      color={colors.accentText}
      name={chip.isPlaying ? 'pause' : 'play'}
      size={ICON_SIZE}
    />
    <Text numberOfLines={1} style={styles.title}>
      {chip.title}
    </Text>
  </Pressable>
);

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accentBorderDeep,
    borderRadius: radius.pill,
    borderWidth: 1,
    bottom: CHIP_BOTTOM_GAP,
    flexDirection: 'row',
    gap: space.xs,
    maxWidth: 320,
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: space.md,
    position: 'absolute',
  },
  title: { color: colors.text, flexShrink: 1, fontSize: 13 },
});
