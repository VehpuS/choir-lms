import { Slider } from '@miblanchard/react-native-slider';
import { type PlayableItem } from '@org/audio-library-models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import {
  LOOP_BUILDER_NUDGE_STEP_MS,
  type LoopBuilderBoundary,
} from '../../utils/saved-loop-view-model';
import {
  LOOP_SELECTOR_PRIMARY_TEXT,
  LOOP_SELECTOR_SECONDARY_TEXT,
  formatRangeLabel,
} from './shared';

type LoopRangeSelectorRangeCardProps = {
  endMs: number;
  onNudgeBoundary: (
    boundary: LoopBuilderBoundary,
    direction: 'earlier' | 'later',
  ) => void;
  onRangeChange: (sliderValue: number | number[]) => void;
  rangeMaximumMs: number | null;
  selectedTrack: PlayableItem;
  startMs: number;
};

const NudgeButton = ({
  accessibilityLabel,
  disabled,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) => {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      {...interactionGuardProps}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.nudgeButton,
        buttonInteractionGuardStyle,
        pressed && !disabled ? styles.buttonPressed : undefined,
        disabled ? styles.buttonDisabled : undefined,
      ]}
    >
      <Text style={styles.nudgeButtonLabel}>{label}</Text>
    </Pressable>
  );
};

export const LoopRangeSelectorRangeCard = ({
  endMs,
  onNudgeBoundary,
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
  const isStartNudgeEarlierDisabled = startMs <= 0;
  const isStartNudgeLaterDisabled =
    startMs >= endMs - LOOP_BUILDER_NUDGE_STEP_MS;
  const isEndNudgeEarlierDisabled =
    endMs <= startMs + LOOP_BUILDER_NUDGE_STEP_MS;
  const isEndNudgeLaterDisabled =
    rangeMaximumMs !== null && endMs >= rangeMaximumMs;

  return (
    <View style={styles.rangeCard}>
      <View style={styles.rangeSummaryRow}>
        <View style={styles.rangeChip}>
          <Text style={styles.rangeChipLabel}>Start</Text>
          <Text style={styles.rangeChipValue}>{formatRangeLabel(startMs)}</Text>
          <View style={styles.nudgeRow}>
            <NudgeButton
              accessibilityLabel="Move loop start earlier"
              disabled={isStartNudgeEarlierDisabled}
              label="−"
              onPress={() => {
                onNudgeBoundary('start', 'earlier');
              }}
            />
            <NudgeButton
              accessibilityLabel="Move loop start later"
              disabled={isStartNudgeLaterDisabled}
              label="+"
              onPress={() => {
                onNudgeBoundary('start', 'later');
              }}
            />
          </View>
        </View>
        <View style={styles.rangeChip}>
          <Text style={styles.rangeChipLabel}>End</Text>
          <Text style={styles.rangeChipValue}>{formatRangeLabel(endMs)}</Text>
          <View style={styles.nudgeRow}>
            <NudgeButton
              accessibilityLabel="Move loop end earlier"
              disabled={isEndNudgeEarlierDisabled}
              label="−"
              onPress={() => {
                onNudgeBoundary('end', 'earlier');
              }}
            />
            <NudgeButton
              accessibilityLabel="Move loop end later"
              disabled={isEndNudgeLaterDisabled}
              label="+"
              onPress={() => {
                onNudgeBoundary('end', 'later');
              }}
            />
          </View>
        </View>
        <View style={styles.rangeChip}>
          <Text style={styles.rangeChipLabel}>Length</Text>
          <Text style={styles.rangeChipValue}>
            {formatRangeLabel(rangeDurationMs)}
          </Text>
        </View>
      </View>

      <View {...interactionGuardProps} style={continuousInteractionGuardStyle}>
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
      </View>

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
  nudgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  nudgeButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#e7e0d2',
  },
  nudgeButtonLabel: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 18,
  },
  buttonPressed: {
    opacity: 0.86,
  },
  buttonDisabled: {
    opacity: 0.4,
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
