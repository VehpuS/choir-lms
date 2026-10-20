import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../../components/compact-playback-action';
import { SegmentedControl } from '../../../../components/segmented-control';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import { appTheme } from '../../../../utils/theme';
import {
  LYRICS_TEXT_SIZES,
  LYRICS_TEXT_SIZE_LABELS,
  resolveLyricsTextStyle,
  setLyricsTextSize,
  useLyricsTextSize,
} from '../../lyrics-text-size';
import { useBestEffortKeepAwake } from '../../../../hooks/use-best-effort-keep-awake';

// Reading happens with the phone held out, so the screen stays on while this
// view is open; the hook releases the lock when it unmounts.
const KEEP_AWAKE_TAG = 'lyrics-reading-mode';

const TEXT_SIZE_OPTIONS = LYRICS_TEXT_SIZES.map((size) => ({
  accessibilityLabel: `${LYRICS_TEXT_SIZE_LABELS[size]} text`,
  label: LYRICS_TEXT_SIZE_LABELS[size],
  value: size,
}));

type LyricsReadingModeProps = {
  isPlaybackToggleDisabled: boolean;
  isPlaying: boolean;
  onClose: () => void;
  onTogglePlayback: () => void;
  ownerName: string;
  text: string;
};

/**
 * Full-screen lyrics: a large, left-aligned column on the Nocturne ground, with
 * the text-size control, a close control, and a play/pause control so playback
 * stays reachable. Text is selectable; nothing scrolls or tracks by itself.
 */
export const LyricsReadingMode = ({
  isPlaybackToggleDisabled,
  isPlaying,
  onClose,
  onTogglePlayback,
  ownerName,
  text,
}: LyricsReadingModeProps) => {
  const size = useLyricsTextSize();

  useBestEffortKeepAwake(KEEP_AWAKE_TAG);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Text numberOfLines={1} style={styles.title}>
            {ownerName}
          </Text>
          <SurfaceIconButton
            accessibilityLabel="Close lyrics"
            icon="close"
            onPress={onClose}
          />
        </View>
        <SegmentedControl
          accessibilityLabel="Lyrics text size"
          onSelect={setLyricsTextSize}
          options={TEXT_SIZE_OPTIONS}
          selectedValue={size}
        />
        <ScrollView
          contentContainerStyle={styles.column}
          style={[darkScrollbarStyle, styles.scroll]}
        >
          <Text selectable style={resolveLyricsTextStyle(size)}>
            {text}
          </Text>
        </ScrollView>
        <View style={styles.transport}>
          <CompactPlaybackAction
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            disabled={isPlaybackToggleDisabled}
            iconName={isPlaying ? 'pause' : 'play'}
            onPress={onTogglePlayback}
            variant="card"
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  column: {
    paddingVertical: appTheme.space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: appTheme.space.md,
  },
  screen: {
    flex: 1,
    gap: appTheme.space.md,
    paddingHorizontal: appTheme.space.screenInset,
    paddingVertical: appTheme.space.lg,
    backgroundColor: appTheme.colors.bg,
  },
  scroll: {
    flex: 1,
  },
  title: {
    ...appTheme.type.rowTitle,
    flex: 1,
    color: appTheme.colors.text,
  },
  transport: {
    alignItems: 'center',
  },
});
