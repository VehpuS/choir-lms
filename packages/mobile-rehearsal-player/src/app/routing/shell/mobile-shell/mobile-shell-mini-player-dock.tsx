import type { PlayableItem } from '@org/audio-library-models';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import { PlaybackWaveform } from '../../../components/playback-waveform';
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
import { appTheme } from '../../../utils/theme';

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
