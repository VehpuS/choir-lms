import type { PlayableItem } from '@org/audio-library-models';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { PlaybackWaveform } from '../../../components/playback-waveform';
import { useLyricsFor } from '../../../library/components/saved-item-menu/saved-item-availability-context';
import { shouldShowMiniPlayerLyrics } from '../../../library/lyrics/components/lyrics-viewer/model';
import { requestLyricsView } from '../../../library/lyrics/lyrics-view-request';
import { getProgressLineWidth } from '../../../components/playback-waveform/model';
import type { SavedTrackPlaybackState } from '../../../library/playback/utils/saved-track-playback-view-model';
import { getPlaybackToggleControlModel } from '../../playback/playback-toggle-control-model';
import { styles } from '../mobile-shell-styles';
import { PlaybackMarqueeText } from '../playback-marquee-text';
import {
  type MiniPlayerSummary,
  type ShellDestinationKey,
} from '../shell-model';
import { ShellTabBar } from '../shell-tab-bar';
import { usePianoToggle } from '../../../library/piano/piano-toggle';
import { appTheme } from '../../../utils/theme';
import { ariaStateProps } from '../../../components/aria-state';

const MINI_PLAYER_TOGGLE_ICON_SIZE = 20;

type MobileShellMiniPlayerDockProps = {
  activeDestination: ShellDestinationKey;
  activePlayableItem: PlayableItem | null;
  /** Download progress while web playback fetches the active item. */
  downloadLabel: string | null;
  isPlaybackLoading: boolean;
  isPlaybackToggleDisabled: boolean;
  miniPlayerSummary: MiniPlayerSummary | null;
  onOpenNowPlaying: () => void;
  onSelectDestination: (destination: ShellDestinationKey) => void;
  onTogglePlayback: () => void;
  playbackState: SavedTrackPlaybackState | undefined;
  playbackToggleLabel: string;
};

export const MobileShellMiniPlayerDock = ({
  activeDestination,
  activePlayableItem,
  downloadLabel,
  isPlaybackLoading,
  isPlaybackToggleDisabled,
  miniPlayerSummary,
  onOpenNowPlaying,
  onSelectDestination,
  onTogglePlayback,
  playbackState,
  playbackToggleLabel,
}: MobileShellMiniPlayerDockProps) => {
  const lyricsResolution = useLyricsFor({
    sourceId: activePlayableItem?.sourceId ?? '',
  });
  const pianoToggle = usePianoToggle();
  const playbackToggleControl = miniPlayerSummary
    ? getPlaybackToggleControlModel({
        playbackToggleLabel,
        title: miniPlayerSummary.title,
      })
    : null;

  return (
    <View style={styles.bottomDock}>
      {miniPlayerSummary ? (
        <View style={styles.miniPlayer}>
          <Pressable
            accessibilityLabel={miniPlayerSummary.accessibilityLabel}
            accessibilityRole="button"
            onPress={onOpenNowPlaying}
            style={({ pressed }) => [
              styles.miniPlayerBody,
              pressed ? styles.miniPlayerPressed : null,
            ]}
            testID="mini-player"
          >
            {activePlayableItem ? (
              <PlaybackWaveform
                activePlayableItem={activePlayableItem}
                progressRatio={miniPlayerSummary.waveformProgressRatio}
                style={styles.miniPlayerWaveform}
                variant="mini"
              />
            ) : null}
            <View style={styles.miniPlayerCopy}>
              <PlaybackMarqueeText
                containerStyle={styles.miniPlayerTitleWrap}
                enabled={playbackState === 'playing'}
                style={styles.miniPlayerTitle}
                text={miniPlayerSummary.title}
              />
              <Text numberOfLines={1} style={styles.miniPlayerContext}>
                {downloadLabel ?? miniPlayerSummary.context}
              </Text>
            </View>
          </Pressable>
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
                styles.miniPlayerLyricsButton,
                pressed ? styles.miniPlayerPressed : null,
              ]}
            >
              <AppIcon
                color={appTheme.colors.accentText}
                name="text-align-left"
                size={MINI_PLAYER_TOGGLE_ICON_SIZE}
              />
            </Pressable>
          ) : null}
          {pianoToggle ? (
            <Pressable
              accessibilityLabel={pianoToggle.accessibilityLabel}
              accessibilityRole="button"
              accessibilityState={{ selected: pianoToggle.selected }}
              {...ariaStateProps({ selected: pianoToggle.selected })}
              onPress={pianoToggle.toggle}
              style={({ pressed }) => [
                styles.miniPlayerLyricsButton,
                pressed ? styles.miniPlayerPressed : null,
              ]}
            >
              <AppIcon
                color={
                  pianoToggle.selected
                    ? appTheme.colors.accentText
                    : appTheme.colors.icon
                }
                name="piano-keyboard"
                size={MINI_PLAYER_TOGGLE_ICON_SIZE}
              />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={
              playbackToggleControl?.accessibilityLabel ??
              'Play current playback'
            }
            accessibilityRole="button"
            accessibilityState={{
              disabled: isPlaybackToggleDisabled,
              selected: playbackToggleControl?.selected ?? false,
            }}
            {...ariaStateProps({
              disabled: isPlaybackToggleDisabled,
              selected: playbackToggleControl?.selected ?? false,
            })}
            disabled={isPlaybackToggleDisabled}
            onPress={onTogglePlayback}
            style={({ pressed }) => [
              styles.miniPlayerActionButton,
              pressed && !isPlaybackToggleDisabled
                ? styles.miniPlayerPressed
                : null,
              isPlaybackToggleDisabled ? styles.miniPlayerActionDisabled : null,
            ]}
          >
            {isPlaybackLoading ? (
              <ActivityIndicator color={appTheme.colors.accentText} />
            ) : (
              <AppIcon
                color={appTheme.colors.accentText}
                name={playbackToggleControl?.iconName ?? 'play'}
                size={MINI_PLAYER_TOGGLE_ICON_SIZE}
              />
            )}
          </Pressable>
          {/* Progress only, not a scrubber: it ignores touches. */}
          <View
            pointerEvents="none"
            style={[
              styles.miniPlayerProgressLine,
              {
                width: getProgressLineWidth(
                  miniPlayerSummary.waveformProgressRatio,
                ),
              },
            ]}
            testID="mini-player-progress-line"
          />
        </View>
      ) : null}
      <ShellTabBar
        activeDestination={activeDestination}
        onSelectDestination={onSelectDestination}
      />
    </View>
  );
};
