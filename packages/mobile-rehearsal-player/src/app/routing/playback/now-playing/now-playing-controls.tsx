import { Slider } from '@miblanchard/react-native-slider';
import type {
  PlayableItem,
  RehearsalQueueMode,
  RepeatMode,
} from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../components/interaction-guard';
import { PlaybackWaveform } from '../../../components/playback-waveform';
import { getPlaybackBoundsSeconds } from '../../../components/playback-waveform/model';
import { appTheme } from '../../../utils/theme';
import { getNowPlayingTimelineLabels } from './now-playing-model';
import { nowPlayingStyles as styles } from './styles';
import { getPracticeShapingTiles } from '../shaping/shaping-surface-model';
import type { PlaybackShapingControls } from '../shaping/shaping-surface-model';
import { getPracticeTiles } from './practice-row-model';

const PRACTICE_ICON_SIZE = 22;
const VOLUME_ICON_SIZE = 16;
const MUTED_VOLUME_THRESHOLD = 0.01;

const getSliderNumber = (value: number | number[]) => {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
};

// While the duration is unknown the scale grows with the playhead, as before.
const getTimelineSeconds = (
  activePlayableItem: PlayableItem,
  playbackPositionSeconds: number,
) => {
  const { endSeconds, startSeconds } =
    getPlaybackBoundsSeconds(activePlayableItem);
  const totalSeconds =
    endSeconds > startSeconds
      ? endSeconds - startSeconds
      : playbackPositionSeconds - startSeconds;

  return {
    elapsedSeconds: playbackPositionSeconds - startSeconds,
    totalSeconds,
  };
};

export const NowPlayingTimeline = (props: {
  activePlayableItem: PlayableItem;
  canSeekActivePlayback: boolean;
  onSeekToPosition: (positionSeconds: number) => void;
  playbackPositionSeconds: number;
  progressRatio: number;
}) => {
  const labels = getNowPlayingTimelineLabels(
    getTimelineSeconds(props.activePlayableItem, props.playbackPositionSeconds),
  );

  return (
    <View style={styles.timeline}>
      <PlaybackWaveform
        activePlayableItem={props.activePlayableItem}
        interactive={props.canSeekActivePlayback}
        onScrubToPosition={props.onSeekToPosition}
        progressRatio={props.progressRatio}
        variant="scrubber"
      />
      <View style={styles.timelineScale}>
        <Text style={styles.timecode}>{labels.elapsed}</Text>
        <Text style={styles.timecode}>{labels.remaining}</Text>
      </View>
    </View>
  );
};

export const PlaybackPracticeRow = (props: {
  isDisabled: boolean;
  onOpenShaping: () => void;
  onSelectQueueMode: (mode: RehearsalQueueMode) => void;
  onSelectRepeatMode: (mode: RepeatMode) => void;
  queueMode: RehearsalQueueMode | null;
  repeatMode: RepeatMode;
  shaping: Pick<PlaybackShapingControls, 'canShapePitch' | 'effective'>;
}) => {
  const shapingTiles = getPracticeShapingTiles(props.shaping);
  const tiles = getPracticeTiles({
    queueMode: props.queueMode,
    repeatMode: props.repeatMode,
  });

  return (
    <View style={styles.practiceRow}>
      {shapingTiles.map((tile) => (
        <Pressable
          accessibilityLabel={tile.accessibilityLabel}
          accessibilityRole="button"
          {...interactionGuardProps}
          key={tile.key}
          onPress={props.onOpenShaping}
          style={({ pressed }) => [
            styles.practiceReadoutTile,
            tile.isInert ? styles.practiceReadoutTileInert : null,
            buttonInteractionGuardStyle,
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={styles.practiceReadoutKicker}>{tile.kicker}</Text>
          <Text
            style={[
              styles.practiceReadout,
              tile.isShaped ? null : styles.practiceReadoutIdle,
            ]}
          >
            {tile.readout}
          </Text>
        </Pressable>
      ))}
      {tiles.map((tile) => {
        const onPress =
          tile.key === 'repeat'
            ? () => {
                props.onSelectRepeatMode(tile.nextMode);
              }
            : () => {
                props.onSelectQueueMode(tile.nextMode);
              };

        return (
          <Pressable
            accessibilityHint={tile.accessibilityHint}
            accessibilityLabel={tile.accessibilityLabel}
            accessibilityRole="button"
            accessibilityState={{
              disabled: props.isDisabled,
              selected: tile.selected,
            }}
            {...interactionGuardProps}
            disabled={props.isDisabled}
            key={tile.key}
            onPress={onPress}
            style={({ pressed }) => [
              styles.practiceTile,
              tile.selected ? styles.practiceTileSelected : null,
              buttonInteractionGuardStyle,
              pressed && !props.isDisabled ? styles.pressed : null,
              props.isDisabled ? styles.disabled : null,
            ]}
          >
            <AppIcon
              color={
                tile.selected
                  ? appTheme.colors.accentText
                  : appTheme.colors.icon
              }
              name={tile.icon}
              size={PRACTICE_ICON_SIZE}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

export const PlaybackVolumeRow = (props: {
  onSetPlaybackVolume: (volumeLevel: number) => void;
  volumeLevel: number;
}) => {
  const [draftVolumeLevel, setDraftVolumeLevel] = useState(props.volumeLevel);

  useEffect(() => {
    setDraftVolumeLevel(props.volumeLevel);
  }, [props.volumeLevel]);

  return (
    <View style={styles.volumeRow}>
      <AppIcon
        color={appTheme.colors.textMuted}
        name={
          draftVolumeLevel <= MUTED_VOLUME_THRESHOLD
            ? 'volume-off'
            : 'volume-low'
        }
        size={VOLUME_ICON_SIZE}
      />
      <View
        {...interactionGuardProps}
        style={[continuousInteractionGuardStyle, styles.volumeSlider]}
      >
        <Slider
          maximumTrackTintColor={appTheme.colors.divider}
          maximumValue={1}
          minimumTrackTintColor={appTheme.colors.accent}
          minimumValue={0}
          onValueChange={(nextVolumeLevel) => {
            const resolvedVolumeLevel = getSliderNumber(nextVolumeLevel);

            setDraftVolumeLevel(resolvedVolumeLevel);
            props.onSetPlaybackVolume(resolvedVolumeLevel);
          }}
          thumbTintColor={appTheme.colors.text}
          value={draftVolumeLevel}
        />
      </View>
      <AppIcon
        color={appTheme.colors.textMuted}
        name="volume-high"
        size={VOLUME_ICON_SIZE}
      />
    </View>
  );
};
