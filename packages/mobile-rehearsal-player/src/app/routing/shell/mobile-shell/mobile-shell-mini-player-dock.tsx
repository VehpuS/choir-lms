import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PlayableItem } from '@org/audio-library-models';
import { Pressable, Text, View } from 'react-native';

import { PlaybackWaveform } from '../../../components/playback-waveform';
import type { SavedTrackPlaybackState } from '../../../library/playback/utils/saved-track-playback-view-model';
import { getPlaybackToggleControlModel } from '../../playback/playback-toggle-control-model';
import { styles } from '../mobile-shell-styles';
import { PlaybackMarqueeText } from '../playback-marquee-text';
import { type MiniPlayerSummary, type ShellDestinationKey } from '../shell-model';
import { ShellTabBar } from '../shell-tab-bar';

type MobileShellMiniPlayerDockProps = {
  activeDestination: ShellDestinationKey;
  activePlayableItem: PlayableItem | null;
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
    <View
      style={[
        styles.bottomDock,
        !miniPlayerSummary ? styles.bottomDockTabsOnly : null,
      ]}
    >
      {miniPlayerSummary ? (
        <View style={styles.miniPlayer}>
          <Pressable
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
                appearance="dark"
                progressRatio={miniPlayerSummary.waveformProgressRatio}
                style={styles.miniPlayerWaveform}
                variant="compact"
              />
            ) : null}
            <View style={styles.miniPlayerCopy}>
              <Text style={styles.miniPlayerLabel}>Now playing</Text>
              <PlaybackMarqueeText
                containerStyle={styles.miniPlayerTitleWrap}
                enabled={playbackState === 'playing'}
                style={styles.miniPlayerTitle}
                text={miniPlayerSummary.title}
              />
              <Text numberOfLines={1} style={styles.miniPlayerStatus}>
                {miniPlayerSummary.status}
              </Text>
              <Text numberOfLines={1} style={styles.miniPlayerDetail}>
                {miniPlayerSummary.detail}
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
              isPlaybackToggleDisabled
                ? styles.miniPlayerActionDisabled
                : null,
            ]}
          >
            <MaterialCommunityIcons
              color="#fff8ef"
              name={playbackToggleControl?.iconName ?? 'play'}
              size={24}
            />
          </Pressable>
        </View>
      ) : null}
      <ShellTabBar
        activeDestination={activeDestination}
        onSelectDestination={onSelectDestination}
      />
    </View>
  );
};