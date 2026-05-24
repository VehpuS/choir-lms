import { type PlayableItem } from '@org/rehearsal-domain';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDurationLabel } from '../utils/drive-library-view-model';

type SavedLoopBuilderCardProps = {
  builderIssue: {
    title: string;
    message: string;
  } | null;
  canCaptureMarkers: boolean;
  canSaveLoop: boolean;
  currentPositionMs: number;
  endMs: number | null;
  isSavingLoop: boolean;
  loopName: string;
  onLoopNameChange: (value: string) => void;
  onSaveLoop: () => void;
  onSetEndMarker: () => void;
  onSetStartMarker: () => void;
  selectedTrack: PlayableItem | null;
  startMs: number | null;
};

const ERROR_SURFACE = '#fff1ed';
const ERROR_TEXT = '#8a2d1f';
const INPUT_BACKGROUND = '#fff9f0';
const PLACEHOLDER_TEXT = '#857b6c';
const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

const formatMarkerLabel = (value: number | null) => {
  if (value === null) {
    return 'Not set';
  }

  return formatDurationLabel(value) ?? '0:00';
};

const getLoopBuilderGuidance = (options: {
  canCaptureMarkers: boolean;
  selectedTrack: PlayableItem | null;
}) => {
  if (!options.selectedTrack) {
    return '1. Tap Use for loop on a saved rehearsal track. 2. Tap Play on that same track. 3. Use Set start and Set end at the exact playback times you want to keep.';
  }

  if (!options.canCaptureMarkers) {
    return `Selected track: ${options.selectedTrack.title}. Tap Play on that saved track, then use Set start at the loop beginning and Set end at the loop ending.`;
  }

  return `Selected track: ${options.selectedTrack.title}. Set start at the loop beginning, move playback to the ending, then tap Set end before saving.`;
};

export const SavedLoopBuilderCard = ({
  builderIssue,
  canCaptureMarkers,
  canSaveLoop,
  currentPositionMs,
  endMs,
  isSavingLoop,
  loopName,
  onLoopNameChange,
  onSaveLoop,
  onSetEndMarker,
  onSetStartMarker,
  selectedTrack,
  startMs,
}: SavedLoopBuilderCardProps) => {
  const builderGuidance = getLoopBuilderGuidance({
    canCaptureMarkers,
    selectedTrack,
  });

  return (
    <View style={styles.builderCard}>
      <Text style={styles.builderTitle}>Loop builder</Text>
      <Text style={styles.builderBody}>{builderGuidance}</Text>

      {selectedTrack && canCaptureMarkers ? (
        <Text style={styles.captureLabel}>
          Current playback time{' '}
          {formatDurationLabel(currentPositionMs) ?? '0:00'}
        </Text>
      ) : null}

      <View style={styles.markerActions}>
        <Pressable
          accessibilityRole="button"
          disabled={!canCaptureMarkers}
          onPress={onSetStartMarker}
          style={({ pressed }) => [
            styles.markerButton,
            pressed && canCaptureMarkers
              ? styles.actionButtonPressed
              : undefined,
            !canCaptureMarkers ? styles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.markerButtonLabel}>Set start</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={!canCaptureMarkers}
          onPress={onSetEndMarker}
          style={({ pressed }) => [
            styles.markerButton,
            pressed && canCaptureMarkers
              ? styles.actionButtonPressed
              : undefined,
            !canCaptureMarkers ? styles.actionButtonDisabled : undefined,
          ]}
        >
          <Text style={styles.markerButtonLabel}>Set end</Text>
        </Pressable>
      </View>

      <Text style={styles.helperText}>
        The marker buttons capture the current playback time. You can pause on
        the exact moment you want, then set the marker.
      </Text>

      <View style={styles.markerSummary}>
        <View style={styles.markerChip}>
          <Text style={styles.markerChipLabel}>Start</Text>
          <Text style={styles.markerChipValue}>
            {formatMarkerLabel(startMs)}
          </Text>
        </View>
        <View style={styles.markerChip}>
          <Text style={styles.markerChipLabel}>End</Text>
          <Text style={styles.markerChipValue}>{formatMarkerLabel(endMs)}</Text>
        </View>
      </View>

      <TextInput
        autoCorrect={false}
        onChangeText={onLoopNameChange}
        placeholder="Name this practice loop"
        placeholderTextColor={PLACEHOLDER_TEXT}
        returnKeyType="done"
        style={styles.nameInput}
        value={loopName}
      />

      {builderIssue ? (
        <View style={styles.issueCard}>
          <Text style={styles.issueTitle}>{builderIssue.title}</Text>
          <Text style={styles.issueMessage}>{builderIssue.message}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!canSaveLoop}
        onPress={onSaveLoop}
        style={({ pressed }) => [
          styles.saveButton,
          pressed && canSaveLoop ? styles.actionButtonPressed : undefined,
          !canSaveLoop ? styles.actionButtonDisabled : undefined,
        ]}
      >
        <Text style={styles.saveButtonLabel}>
          {isSavingLoop ? 'Saving loop…' : 'Save named loop'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  builderCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffdf8',
  },
  builderTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  builderBody: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
  captureLabel: {
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  markerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  markerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 999,
    backgroundColor: '#faf6ee',
  },
  markerButtonLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  markerSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  markerChip: {
    gap: 4,
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f6f1e7',
  },
  markerChipLabel: {
    color: SECONDARY_TEXT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  markerChipValue: {
    color: PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  nameInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 14,
    backgroundColor: INPUT_BACKGROUND,
    color: PRIMARY_TEXT,
    fontSize: 15,
  },
  issueCard: {
    gap: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: ERROR_SURFACE,
  },
  issueTitle: {
    color: ERROR_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  issueMessage: {
    color: ERROR_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  saveButtonLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
});
