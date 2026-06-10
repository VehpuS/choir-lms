import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PlayableItem } from '@org/audio-library-models';
import { Slider } from '@miblanchard/react-native-slider';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatDurationLabel } from '../../library/utils/drive-library-view-model';
import { appTheme } from '../../utils/theme';
import { PlaybackWaveform } from '../../components/playback-waveform';

type PlaybackTimelineCardProps = {
  activePlayableItem: PlayableItem;
  canSeekActivePlayback: boolean;
  onSeekToPosition: (positionSeconds: number) => void;
  playbackPositionSeconds: number;
  progressRatio: number;
};

type PlaybackVolumeCardProps = {
  isDisabled: boolean;
  onSetPlaybackVolume: (volumeLevel: number) => void;
  volumeLevel: number;
};

const getLabelForSeconds = (seconds: number) => {
  return formatDurationLabel(Math.round(seconds * 1000)) ?? '0:00';
};

const getSliderNumber = (value: number | number[]) => {
  return Array.isArray(value) ? (value[0] ?? 0) : value;
};

const getTimelineBounds = (
  activePlayableItem: PlayableItem,
  playbackPositionSeconds: number,
) => {
  const minimumPositionSeconds = activePlayableItem.range.startMs / 1000;
  const maximumRangeSeconds =
    (activePlayableItem.range.endMs ??
      activePlayableItem.source.durationMs ??
      Math.round(playbackPositionSeconds * 1000)) / 1000;
  const maximumPositionSeconds = Math.max(
    minimumPositionSeconds,
    maximumRangeSeconds,
  );
  const currentPositionSeconds = Math.min(
    maximumPositionSeconds,
    Math.max(minimumPositionSeconds, playbackPositionSeconds),
  );

  return {
    currentPositionSeconds,
    maximumPositionSeconds,
    minimumPositionSeconds,
  };
};

export const PlaybackTimelineCard = ({
  activePlayableItem,
  canSeekActivePlayback,
  onSeekToPosition,
  playbackPositionSeconds,
  progressRatio,
}: PlaybackTimelineCardProps) => {
  const {
    currentPositionSeconds,
    maximumPositionSeconds,
    minimumPositionSeconds,
  } = getTimelineBounds(activePlayableItem, playbackPositionSeconds);
  const elapsedPositionSeconds = Math.max(
    0,
    currentPositionSeconds - minimumPositionSeconds,
  );
  const totalDurationSeconds = Math.max(
    0,
    maximumPositionSeconds - minimumPositionSeconds,
  );

  return (
    <View style={[styles.card, styles.timelineCard]}>
      <PlaybackWaveform
        activePlayableItem={activePlayableItem}
        interactive={canSeekActivePlayback}
        onScrubToPosition={onSeekToPosition}
        progressRatio={progressRatio}
        style={styles.embeddedWaveform}
        variant="hero"
      />
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>
          {getLabelForSeconds(elapsedPositionSeconds)}
        </Text>
        <Text style={styles.scaleLabel}>
          {getLabelForSeconds(totalDurationSeconds)}
        </Text>
      </View>
    </View>
  );
};

export const PlaybackVolumeCard = ({
  isDisabled,
  onSetPlaybackVolume,
  volumeLevel,
}: PlaybackVolumeCardProps) => {
  const [draftVolumeLevel, setDraftVolumeLevel] = useState(volumeLevel);

  useEffect(() => {
    setDraftVolumeLevel(volumeLevel);
  }, [volumeLevel]);

  return (
    <View style={styles.card}>
      <Text style={styles.valueLabel}>
        {Math.round(draftVolumeLevel * 100)}%
      </Text>
      <Slider
        disabled={isDisabled}
        maximumTrackTintColor="#d5ddd7"
        maximumValue={1}
        minimumTrackTintColor="#305c4d"
        minimumValue={0}
        onValueChange={(nextVolumeLevel) => {
          const resolvedVolumeLevel = getSliderNumber(nextVolumeLevel);

          setDraftVolumeLevel(resolvedVolumeLevel);
          onSetPlaybackVolume(resolvedVolumeLevel);
        }}
        thumbTintColor="#305c4d"
        value={draftVolumeLevel}
      />
      <View style={styles.scaleRow}>
        <View style={styles.scaleEndpoint}>
          <MaterialCommunityIcons
            color={appTheme.colors.secondaryText}
            name={draftVolumeLevel <= 0.01 ? 'volume-off' : 'volume-low'}
            size={16}
          />
          <Text style={styles.scaleLabel}>Mute</Text>
        </View>
        <View style={styles.scaleEndpoint}>
          <MaterialCommunityIcons
            color={appTheme.colors.secondaryText}
            name="volume-high"
            size={16}
          />
          <Text style={styles.scaleLabel}>Full</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
  timelineCard: {
    gap: 6,
  },
  embeddedWaveform: {
    minHeight: 96,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderWidth: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scaleEndpoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scaleLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
  valueLabel: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
});
