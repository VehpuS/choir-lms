import type { ReactNode } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { CompactPlaybackAction } from '../../../../components/compact-playback-action';
import { SegmentedControl } from '../../../../components/segmented-control';
import { SurfaceIconButton } from '../../../../components/surface-icon-button';
import { darkScrollbarStyle } from '../../../../components/dark-scrollbar';
import { SafeAreaScreen } from '../../../../components/safe-area-frame';
import { getLayoutClass } from '../../../../routing/shell/layout-class';
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

/** Wide enough for four size labels beside the title, play / pause and close. */
const SIZE_CONTROL_WIDTH = 340;

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
  /** A composite's stem chips; null for any other item. */
  picker?: ReactNode;
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
  picker,
  text,
}: LyricsReadingModeProps) => {
  const size = useLyricsTextSize();
  // A phone on its side: the size control and play / pause join the title row,
  // so the text keeps the height they would take as rows of their own.
  // This view is opened by a host above the shell, so it reads the window
  // itself rather than the shell's layout class (no hysteresis: a Modal is
  // rarely resized while it is open).
  const { height, width } = useWindowDimensions();
  const isWideShort =
    getLayoutClass({ height, width }, 'compact') === 'wide-short';

  useBestEffortKeepAwake(KEEP_AWAKE_TAG);

  const sizeControl = (
    <SegmentedControl
      accessibilityLabel="Lyrics text size"
      onSelect={setLyricsTextSize}
      options={TEXT_SIZE_OPTIONS}
      selectedValue={size}
    />
  );
  const transport = (
    <View style={styles.transport}>
      <CompactPlaybackAction
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        disabled={isPlaybackToggleDisabled}
        iconName={isPlaying ? 'pause' : 'play'}
        onPress={onTogglePlayback}
        variant="card"
      />
    </View>
  );

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible>
      <SafeAreaScreen>
        <View style={styles.screen}>
          <View style={styles.header}>
            <Text numberOfLines={1} style={styles.title}>
              {ownerName}
            </Text>
            {isWideShort ? (
              <View style={styles.sizeInHeader}>{sizeControl}</View>
            ) : null}
            {isWideShort ? transport : null}
            <SurfaceIconButton
              accessibilityLabel="Close lyrics"
              icon="close"
              onPress={onClose}
            />
          </View>
          {isWideShort ? null : sizeControl}
          {picker}
          <ScrollView
            contentContainerStyle={styles.column}
            style={[darkScrollbarStyle, styles.scroll]}
          >
            <Text selectable style={resolveLyricsTextStyle(size)}>
              {text}
            </Text>
          </ScrollView>
          {isWideShort ? null : transport}
        </View>
      </SafeAreaScreen>
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
  // In the header row the size control takes the room the title leaves.
  sizeInHeader: { width: SIZE_CONTROL_WIDTH },
  transport: {
    alignItems: 'center',
  },
});
