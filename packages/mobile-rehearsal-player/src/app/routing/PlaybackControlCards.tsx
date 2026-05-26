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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Timeline</Text>
        <Text style={styles.valueLabel}>
          {getLabelForSeconds(displayedPositionSeconds)}
        </Text>
      </View>
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>Volume</Text>
        <Text style={styles.valueLabel}>
          {Math.round(draftVolumeLevel * 100)}%
        </Text>
      </View>
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
        <Text style={styles.scaleLabel}>Mute</Text>
        <Text style={styles.scaleLabel}>Full</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 22,
    backgroundColor: '#fffdf8',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  valueLabel: {
    color: '#2d584a',
    fontSize: 14,
    fontWeight: '700',
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scaleLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    fontWeight: '600',
  },
});
