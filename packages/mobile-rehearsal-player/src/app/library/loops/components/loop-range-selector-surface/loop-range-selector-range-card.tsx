import { Slider } from '@miblanchard/react-native-slider';
import { type PlayableItem } from '@org/audio-library-models';
import { StyleSheet, Text, View } from 'react-native';

import {
  LOOP_SELECTOR_PRIMARY_TEXT,
  LOOP_SELECTOR_SECONDARY_TEXT,
  formatRangeLabel,
} from './shared';

type LoopRangeSelectorRangeCardProps = {
  endMs: number;
  onRangeChange: (sliderValue: number | number[]) => void;
  rangeMaximumMs: number | null;
  selectedTrack: PlayableItem;
  startMs: number;
};

export const LoopRangeSelectorRangeCard = ({
  endMs,
  onRangeChange,
  rangeMaximumMs,
  selectedTrack,
  startMs,
}: LoopRangeSelectorRangeCardProps) => {
  const rangeDurationMs = Math.max(0, endMs - startMs);
  const maximumValueSeconds = Math.max(
    selectedTrack.range.startMs / 1000,
    (rangeMaximumMs ?? selectedTrack.range.startMs) / 1000,
  );

  return (
    <View style={styles.rangeCard}>
      <View style={styles.rangeSummaryRow}>
        <View style={styles.rangeChip}>
          <Text style={styles.rangeChipLabel}>Start</Text>
          <Text style={styles.rangeChipValue}>{formatRangeLabel(startMs)}</Text>
        </View>
        <View style={styles.rangeChip}>
          <Text style={styles.rangeChipLabel}>End</Text>
          <Text style={styles.rangeChipValue}>{formatRangeLabel(endMs)}</Text>
        </View>
        <View style={styles.rangeChip}>
          <Text style={styles.rangeChipLabel}>Length</Text>
          <Text style={styles.rangeChipValue}>
            {formatRangeLabel(rangeDurationMs)}
          </Text>
        </View>
      </View>

      <Slider
        animateTransitions={false}
        maximumTrackTintColor="#d5ddd7"
        maximumValue={maximumValueSeconds}
        minimumTrackTintColor="#305c4d"
        minimumValue={selectedTrack.range.startMs / 1000}
        onSlidingComplete={onRangeChange}
        onValueChange={onRangeChange}
        step={1}
        thumbTintColor="#305c4d"
        thumbTouchSize={{ width: 36, height: 36 }}
        trackClickable
        value={[startMs / 1000, endMs / 1000]}
      />

      <View style={styles.scaleRow}>
        <Text style={styles.scaleLabel}>
          {formatRangeLabel(selectedTrack.range.startMs)}
        </Text>
        <Text style={styles.scaleLabel}>
          {formatRangeLabel(rangeMaximumMs ?? selectedTrack.range.startMs)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rangeCard: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 18,
    backgroundColor: '#fffaf2',
  },
  rangeSummaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rangeChip: {
    gap: 4,
    minWidth: 92,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f4eee2',
  },
  rangeChipLabel: {
    color: LOOP_SELECTOR_SECONDARY_TEXT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rangeChipValue: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
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
    color: LOOP_SELECTOR_SECONDARY_TEXT,
    fontSize: 12,
    fontWeight: '600',
  },
});