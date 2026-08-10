import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Slider } from '@miblanchard/react-native-slider';
import { type PlayableItem } from '@org/audio-library-models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  buttonInteractionGuardStyle,
  continuousInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { useLongPressRepeat } from '../../hooks/use-long-press-repeat';
import {
  LOOP_BUILDER_NUDGE_STEP_MS,
  type LoopBuilderBoundary,
} from '../../utils/saved-loop-view-model';
import {
  LOOP_SELECTOR_PRIMARY_TEXT,
  LOOP_SELECTOR_SECONDARY_TEXT,
  formatPreciseRangeLabel,
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

const NUDGE_HIT_SLOP = { top: 8, bottom: 8, left: 6, right: 6 };

const NudgeButton = ({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
}: {
  accessibilityLabel: string;
  disabled: boolean;
  icon: 'minus' | 'plus';
  onPress: () => void;
}) => {
  const longPressRepeat = useLongPressRepeat({
    disabled,
    onTrigger: onPress,
  });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...interactionGuardProps}
      disabled={disabled}
      hitSlop={NUDGE_HIT_SLOP}
      onPress={longPressRepeat.onPress}
      onPressIn={longPressRepeat.onPressIn}
      onPressOut={longPressRepeat.onPressOut}
      style={({ pressed }) => [
        styles.nudgeButton,
        buttonInteractionGuardStyle,
        pressed && !disabled ? styles.buttonPressed : undefined,
        disabled ? styles.buttonDisabled : undefined,
      ]}
    >
      <MaterialCommunityIcons
        color={LOOP_SELECTOR_PRIMARY_TEXT}
        name={icon}
        size={16}
      />
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
        <View style={styles.edgeGroup}>
          <Text style={styles.groupLabel}>Start</Text>
          <Text style={styles.groupValue}>
            {formatPreciseRangeLabel(startMs)}
          </Text>
          <View style={styles.nudgeRow}>
            <NudgeButton
              accessibilityLabel="Move loop start earlier"
              disabled={isStartNudgeEarlierDisabled}
              icon="minus"
              onPress={() => {
                onNudgeBoundary('start', 'earlier');
              }}
            />
            <NudgeButton
              accessibilityLabel="Move loop start later"
              disabled={isStartNudgeLaterDisabled}
              icon="plus"
              onPress={() => {
                onNudgeBoundary('start', 'later');
              }}
            />
          </View>
        </View>

        <View style={styles.lengthGroup}>
          <Text style={styles.groupLabel}>Length</Text>
          <Text style={styles.groupValue}>
            {formatPreciseRangeLabel(rangeDurationMs)}
          </Text>
        </View>

        <View style={[styles.edgeGroup, styles.edgeGroupEnd]}>
          <Text style={styles.groupLabel}>End</Text>
          <Text style={styles.groupValue}>{formatPreciseRangeLabel(endMs)}</Text>
          <View style={styles.nudgeRow}>
            <NudgeButton
              accessibilityLabel="Move loop end earlier"
              disabled={isEndNudgeEarlierDisabled}
              icon="minus"
              onPress={() => {
                onNudgeBoundary('end', 'earlier');
              }}
            />
            <NudgeButton
              accessibilityLabel="Move loop end later"
              disabled={isEndNudgeLaterDisabled}
              icon="plus"
              onPress={() => {
                onNudgeBoundary('end', 'later');
              }}
            />
          </View>
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
          step={LOOP_BUILDER_NUDGE_STEP_MS / 1000}
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  edgeGroup: {
    alignItems: 'flex-start',
    gap: 2,
  },
  edgeGroupEnd: {
    alignItems: 'flex-end',
  },
  lengthGroup: {
    alignItems: 'center',
    gap: 2,
  },
  groupLabel: {
    color: LOOP_SELECTOR_SECONDARY_TEXT,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  groupValue: {
    color: LOOP_SELECTOR_PRIMARY_TEXT,
    fontSize: 14,
    fontWeight: '700',
  },
  nudgeRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  nudgeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#e7e0d2',
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
