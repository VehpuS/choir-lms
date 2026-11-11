import type { PlayableItem } from '@org/audio-library-models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { useLyricsFor } from '../../../library/components/saved-item-menu/saved-item-availability-context';
import { shouldShowMiniPlayerLyrics } from '../../../library/lyrics/components/lyrics-viewer/model';
import { requestLyricsView } from '../../../library/lyrics/lyrics-view-request';
import { LEFT_TO_RIGHT_LINE_STYLE } from '../../../utils/bidi-isolate';
import { appTheme } from '../../../utils/theme';
import { NowPlayingTransportRow } from '../../playback/now-playing/now-playing-transport-row';
import { paneBleedStyle } from '../dock-bleed';
import { NOW_PLAYING_PANE_WIDTH } from '../shell-dimensions';
import { SHELL_LAYERS } from '../shell-layers';
import { usePaneExpandGesture } from './use-pane-expand-gesture';
import type { MiniPlayerSummary } from '../shell-model';

const { colors, space } = appTheme;

const PROGRESS_HEIGHT = 3;
const HANDLE_WIDTH = 36;
const HANDLE_HEIGHT = 4;
const HANDLE_OPACITY = 0.6;
const PERCENT = 100;
const LYRICS_ICON_SIZE = 18;
const QUEUE_CONTROLS = [
  'previous-item',
  'toggle-playback',
  'next-item',
] as const;
const SINGLE_CONTROLS = ['toggle-playback'] as const;

type NowPlayingPaneProps = {
  activePlayableItem: PlayableItem | null;
  canSkipNextItem: boolean;
  canSkipPreviousItem: boolean;
  /** Download progress while web playback fetches the active item. */
  downloadLabel: string | null;
  isPlaybackLoading: boolean;
  isPlaybackToggleDisabled: boolean;
  /** `0:12–0:18` for a loop; null for a whole track. */
  loopLabel: string | null;
  miniPlayerSummary: MiniPlayerSummary;
  onOpenNowPlaying: () => void;
  onSkipNextItem: () => void;
  onSkipPreviousItem: () => void;
  onTogglePlayback: () => void;
  playbackToggleLabel: string;
  /** Active speed and pitch, `0.90× · −2 st`; null when unshaped. */
  shapingLabel: string | null;
  supportsQueueNavigation: boolean;
};

/**
 * The wide-short layout's replacement for the mini-player: a pane on the
 * trailing side with the title, progress, previous / play / next, and the
 * speed, pitch and loop, so the library stays in view while a track plays.
 * Tapping the title opens the full playback view. Absent when nothing plays.
 */
export const NowPlayingPane = ({
  activePlayableItem,
  canSkipNextItem,
  canSkipPreviousItem,
  downloadLabel,
  isPlaybackLoading,
  isPlaybackToggleDisabled,
  loopLabel,
  miniPlayerSummary,
  onOpenNowPlaying,
  onSkipNextItem,
  onSkipPreviousItem,
  onTogglePlayback,
  playbackToggleLabel,
  shapingLabel,
  supportsQueueNavigation,
}: NowPlayingPaneProps) => {
  const lyricsResolution = useLyricsFor({
    sourceId: activePlayableItem?.sourceId ?? '',
  });
  const chips = [shapingLabel, loopLabel].filter(
    (chip): chip is string => chip !== null,
  );

  const gesture = usePaneExpandGesture(onOpenNowPlaying);

  return (
    <View style={[styles.pane, paneBleedStyle]}>
      {/* The whole pane opens the playback view: this backdrop sits behind the
          controls and takes a tap or an upward drag anywhere they are not. The
          title below stays the one accessible button, so it is not hidden from
          assistive technology, and the controls are not nested inside it. */}
      <Pressable
        {...gesture.handlers}
        accessible={false}
        onPress={() => {
          if (!gesture.wasDragged.current) {
            onOpenNowPlaying();
          }
        }}
        style={styles.backdrop}
      />
      {/* The grabber says the pane pulls up into the playback view. */}
      <View
        pointerEvents="none"
        style={[styles.handle, { transform: [{ translateY: gesture.lift }] }]}
        testID="now-playing-pane-handle"
      />
      <View
        pointerEvents="box-none"
        style={[styles.content, { transform: [{ translateY: gesture.lift }] }]}
      >
        <Pressable
          accessibilityLabel={miniPlayerSummary.accessibilityLabel}
          accessibilityRole="button"
          onPress={onOpenNowPlaying}
          style={({ pressed }) => [
            styles.copy,
            pressed ? styles.pressed : null,
          ]}
          testID="now-playing-pane"
        >
          <Text numberOfLines={2} style={styles.title}>
            {miniPlayerSummary.title}
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.context, LEFT_TO_RIGHT_LINE_STYLE]}
          >
            {downloadLabel ?? miniPlayerSummary.context}
          </Text>
        </Pressable>
        {/* Progress only, not a scrubber: it ignores touches. */}
        <View pointerEvents="none" style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${miniPlayerSummary.waveformProgressRatio * PERCENT}%`,
              },
            ]}
          />
        </View>
        <NowPlayingTransportRow
          canSeekActivePlayback={false}
          canSkipNextItem={canSkipNextItem}
          canSkipPreviousItem={canSkipPreviousItem}
          controls={supportsQueueNavigation ? QUEUE_CONTROLS : SINGLE_CONTROLS}
          isPlaybackLoading={isPlaybackLoading}
          isPlaybackToggleDisabled={isPlaybackToggleDisabled}
          onSeekBackward={onTogglePlayback}
          onSeekForward={onTogglePlayback}
          onSkipNextItem={onSkipNextItem}
          onSkipPreviousItem={onSkipPreviousItem}
          onTogglePlayback={onTogglePlayback}
          playbackToggleLabel={playbackToggleLabel}
          supportsQueueNavigation={supportsQueueNavigation}
          title={miniPlayerSummary.title}
        />
        <View style={styles.chipRow}>
          {chips.map((chip) => (
            <Text key={chip} style={styles.chip}>
              {chip}
            </Text>
          ))}
          {activePlayableItem &&
          shouldShowMiniPlayerLyrics(lyricsResolution) ? (
            <Pressable
              accessibilityLabel="Show lyrics"
              accessibilityRole="button"
              onPress={() => {
                requestLyricsView({
                  mode: 'peek',
                  sourceId: activePlayableItem.sourceId,
                });
              }}
              style={({ pressed }) => [
                styles.lyricsButton,
                pressed ? styles.pressed : null,
              ]}
            >
              <AppIcon
                color={colors.accentText}
                name="text-align-left"
                size={LYRICS_ICON_SIZE}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  pane: {
    width: NOW_PLAYING_PANE_WIDTH,
    zIndex: SHELL_LAYERS.bottomDock,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderSubtle,
    backgroundColor: colors.surfaceRaised,
  },
  backdrop: StyleSheet.absoluteFillObject,
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  handle: {
    alignSelf: 'center',
    position: 'absolute',
    top: space.xs,
    width: HANDLE_WIDTH,
    height: HANDLE_HEIGHT,
    borderRadius: appTheme.radius.pill,
    backgroundColor: colors.textMuted,
    opacity: HANDLE_OPACITY,
  },
  copy: {
    gap: space.xs,
  },
  pressed: {
    opacity: 0.88,
  },
  title: {
    ...appTheme.type.rowTitle,
    color: colors.text,
  },
  context: {
    color: colors.textMuted,
    fontSize: 11,
    fontVariant: [...appTheme.tabularNumbers],
    lineHeight: 15,
  },
  progressTrack: {
    height: PROGRESS_HEIGHT,
    borderRadius: appTheme.radius.pill,
    backgroundColor: colors.borderSubtle,
    overflow: 'hidden',
  },
  progressFill: {
    height: PROGRESS_HEIGHT,
    backgroundColor: colors.accent,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.xs,
  },
  chip: {
    ...appTheme.type.rowMeta,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: appTheme.radius.pill,
    color: colors.textMuted,
  },
  lyricsButton: {
    width: space.touchTarget,
    height: space.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
