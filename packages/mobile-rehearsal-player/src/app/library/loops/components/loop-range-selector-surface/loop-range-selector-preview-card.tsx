import { type PlayableItem } from '@org/audio-library-models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../../components/compact-playback-action';
import type { CompactPlaybackActionIconName } from '../../../../components/compact-playback-action/model';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { PlaybackWaveform } from '../../../../components/playback-waveform';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';
import type { LoopPreviewPlaybackTimeline } from '../../utils/saved-loop-preview-playback-view-model';
import {
  LOOP_SELECTOR_PRIMARY_TEXT,
  LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND,
  LOOP_SELECTOR_SECONDARY_TEXT,
  formatPlaybackLabel,
} from './shared';

type LoopRangeSelectorPreviewCardProps = {
  canSetBoundaryFromPosition: boolean;
  onScrubPreview: (positionSeconds: number) => void;
  onSetBoundaryFromPosition: (boundary: LoopBuilderBoundary) => void;
  onTogglePreview: () => void;
  previewActionLabel: string;
  previewDisabled: boolean;
  previewIconName: CompactPlaybackActionIconName;
  previewPlayableItem: PlayableItem;
  previewTimeline: LoopPreviewPlaybackTimeline;
};

export const LoopRangeSelectorPreviewCard = ({
  canSetBoundaryFromPosition,
  onScrubPreview,
  onSetBoundaryFromPosition,
  onTogglePreview,
  previewActionLabel,
  previewDisabled,
  previewIconName,
  previewPlayableItem,
  previewTimeline,
}: LoopRangeSelectorPreviewCardProps) => {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewTitleRow}>
        <CompactPlaybackAction
          accessibilityLabel={previewActionLabel}
          disabled={previewDisabled}
          iconName={previewIconName}
          onPress={onTogglePreview}
          variant="chip"
        />
        <Text style={styles.previewTitle}>Preview loop</Text>
      </View>
      <PlaybackWaveform
        activePlayableItem={previewPlayableItem}
        interactive={previewTimeline.canScrub}
        onScrubToPosition={
          previewTimeline.canScrub ? onScrubPreview : undefined
        }
        progressRatio={previewTimeline.progressRatio}
        style={styles.previewWaveform}
      />
      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>
          {formatPlaybackLabel(previewTimeline.elapsedSeconds)}
        </Text>
        <Text style={styles.scaleLabel}>
          {formatPlaybackLabel(previewTimeline.totalDurationSeconds)}
        </Text>
      </View>
      <View style={styles.setFromPositionRow}>
        <Pressable
          accessibilityHint="Sets the loop start to the current preview position"
          accessibilityLabel="Set start here"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSetBoundaryFromPosition }}
          {...interactionGuardProps}
          disabled={!canSetBoundaryFromPosition}
          onPress={() => {
            onSetBoundaryFromPosition('start');
          }}
          style={({ pressed }) => [
            styles.setFromPositionButton,
            buttonInteractionGuardStyle,
            pressed && canSetBoundaryFromPosition
              ? styles.buttonPressed
              : undefined,
            !canSetBoundaryFromPosition ? styles.buttonDisabled : undefined,
          ]}
        >
          <Text style={styles.setFromPositionLabel}>Set start here</Text>
        </Pressable>
        <Pressable
          accessibilityHint="Sets the loop end to the current preview position"
          accessibilityLabel="Set end here"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSetBoundaryFromPosition }}
          {...interactionGuardProps}
          disabled={!canSetBoundaryFromPosition}
          onPress={() => {
            onSetBoundaryFromPosition('end');
          }}
          style={({ pressed }) => [
            styles.setFromPositionButton,
            buttonInteractionGuardStyle,
            pressed && canSetBoundaryFromPosition
              ? styles.buttonPressed
              : undefined,
            !canSetBoundaryFromPosition ? styles.buttonDisabled : undefined,
          ]}
        >
          <Text style={styles.setFromPositionLabel}>Set end here</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  previewCard: {
    gap: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 18,
    backgroundColor: '#fffaf2',
  },
  previewTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewTitle: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  previewWaveform: {
    minHeight: 44,
  },
  setFromPositionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  setFromPositionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: LOOP_SELECTOR_SECONDARY_ACTION_BACKGROUND,
  },
  setFromPositionLabel: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 12,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  scaleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  scaleLabel: {
    color: LOOP_SELECTOR_SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
});
