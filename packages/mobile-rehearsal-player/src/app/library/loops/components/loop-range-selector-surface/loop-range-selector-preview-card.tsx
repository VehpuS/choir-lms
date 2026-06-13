import { type PlayableItem } from '@org/audio-library-models';
import { StyleSheet, Text, View } from 'react-native';

import { PlaybackWaveform } from '../../../../components/playback-waveform';
import type { LoopPreviewPlaybackTimeline } from '../../utils/saved-loop-preview-playback-view-model';
import {
  LOOP_SELECTOR_PRIMARY_TEXT,
  LOOP_SELECTOR_SECONDARY_TEXT,
  formatPlaybackLabel,
} from './shared';

type LoopRangeSelectorPreviewCardProps = {
  onScrubPreview: (positionSeconds: number) => void;
  previewPlayableItem: PlayableItem;
  previewTimeline: LoopPreviewPlaybackTimeline;
};

export const LoopRangeSelectorPreviewCard = ({
  onScrubPreview,
  previewPlayableItem,
  previewTimeline,
}: LoopRangeSelectorPreviewCardProps) => {
  return (
    <View style={styles.previewCard}>
      <Text style={styles.previewTitle}>Preview timeline</Text>
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
      <Text style={styles.previewHint}>
        {previewTimeline.canScrub
          ? 'Drag across the waveform to skim the preview.'
          : 'Start preview playback to scrub through the selected loop.'}
      </Text>
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
  previewTitle: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  previewWaveform: {
    minHeight: 44,
  },
  previewHint: {
    color: LOOP_SELECTOR_SECONDARY_TEXT,
    fontSize: 12,
    lineHeight: 18,
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