import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { PlayableItem } from '@org/audio-library-models';
import { Slider } from '@miblanchard/react-native-slider';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatDurationLabel } from '../library/utils/drive-library-view-model';
import { appTheme } from '../utils/theme';

type PlaybackTimelineCardProps = {
  activePlayableItem: PlayableItem;
  canSeekActivePlayback: boolean;
  onSeekToPosition: (positionSeconds: number) => void;
  playbackPositionSeconds: number;
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
}: PlaybackTimelineCardProps) => {
  const {
    currentPositionSeconds,
    maximumPositionSeconds,
    minimumPositionSeconds,
  } = getTimelineBounds(activePlayableItem, playbackPositionSeconds);
  const [draftPositionSeconds, setDraftPositionSeconds] = useState(
    currentPositionSeconds,
  );
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isDragging) {
      return;
    }

    setDraftPositionSeconds(currentPositionSeconds);
  }, [
    activePlayableItem.id,
    activePlayableItem.playlistEntryId,
    currentPositionSeconds,
    isDragging,
  ]);

  const displayedPositionSeconds = isDragging
    ? draftPositionSeconds
    : currentPositionSeconds;
  const isSliderDisabled =
    !canSeekActivePlayback || maximumPositionSeconds <= minimumPositionSeconds;

  return (
    <View style={styles.card}>
      <Text style={styles.valueLabel}>
        {getLabelForSeconds(displayedPositionSeconds)}
      </Text>
      <Slider
        disabled={isSliderDisabled}
        maximumTrackTintColor="#d5ddd7"
        maximumValue={maximumPositionSeconds}
        minimumTrackTintColor="#305c4d"
        minimumValue={minimumPositionSeconds}
        onSlidingComplete={(nextPositionSeconds) => {
          const resolvedPositionSeconds = getSliderNumber(nextPositionSeconds);

          setIsDragging(false);
          setDraftPositionSeconds(resolvedPositionSeconds);
          onSeekToPosition(resolvedPositionSeconds);
        }}
        onValueChange={(nextPositionSeconds) => {
          const resolvedPositionSeconds = getSliderNumber(nextPositionSeconds);

          setIsDragging(true);
          setDraftPositionSeconds(resolvedPositionSeconds);
        }}
        thumbTintColor="#305c4d"
        value={displayedPositionSeconds}
      />
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>
          {getLabelForSeconds(minimumPositionSeconds)}
        </Text>
        <Text style={styles.scaleLabel}>
          {getLabelForSeconds(maximumPositionSeconds)}
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
  valueLabel: {
    color: '#2d584a',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
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
});
