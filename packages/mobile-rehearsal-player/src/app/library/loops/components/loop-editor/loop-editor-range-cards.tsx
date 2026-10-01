import { Pressable, Text, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import {
  buttonInteractionGuardStyle,
  interactionGuardProps,
} from '../../../../components/interaction-guard';
import { appTheme } from '../../../../utils/theme';
import { useLongPressRepeat } from '../../hooks/use-long-press-repeat';
import {
  getLoopEditorNudgeAvailability,
  type LoopEditorRange,
} from '../../utils/loop-editor-model';
import type { LoopBuilderBoundary } from '../../utils/saved-loop-view-model';
import { formatLoopEditorPrecise } from './format';
import { loopEditorStyles as styles } from './styles';

const NUDGE_ICON_SIZE = 18;

type Nudge = (
  boundary: LoopBuilderBoundary,
  direction: 'earlier' | 'later',
) => void;

type LoopEditorRangeCardsProps = {
  /** Nudging waits until the track's length is known. */
  isLoading: boolean;
  onNudgeBoundary: Nudge;
  range: LoopEditorRange;
  trackDurationMs: number | null;
};

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
  const longPressRepeat = useLongPressRepeat({ disabled, onTrigger: onPress });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      {...interactionGuardProps}
      disabled={disabled}
      onPress={longPressRepeat.onPress}
      onPressIn={longPressRepeat.onPressIn}
      onPressOut={longPressRepeat.onPressOut}
      style={({ pressed }) => [
        styles.nudgeButton,
        buttonInteractionGuardStyle,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <AppIcon
        color={appTheme.colors.text}
        name={icon}
        size={NUDGE_ICON_SIZE}
      />
    </Pressable>
  );
};

const EdgeCard = ({
  boundary,
  disabled,
  label,
  onNudgeBoundary,
  valueMs,
}: {
  boundary: LoopBuilderBoundary;
  disabled: { earlier: boolean; later: boolean };
  label: string;
  onNudgeBoundary: Nudge;
  valueMs: number;
}) => {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{formatLoopEditorPrecise(valueMs)}</Text>
      <View style={styles.nudgeRow}>
        <NudgeButton
          accessibilityLabel={`Move loop ${boundary} earlier`}
          disabled={disabled.earlier}
          icon="minus"
          onPress={() => {
            onNudgeBoundary(boundary, 'earlier');
          }}
        />
        <NudgeButton
          accessibilityLabel={`Move loop ${boundary} later`}
          disabled={disabled.later}
          icon="plus"
          onPress={() => {
            onNudgeBoundary(boundary, 'later');
          }}
        />
      </View>
    </View>
  );
};

// Start, length, and end (1g): the two edges nudge; the length is the result.
export const LoopEditorRangeCards = ({
  isLoading,
  onNudgeBoundary,
  range,
  trackDurationMs,
}: LoopEditorRangeCardsProps) => {
  const availability = getLoopEditorNudgeAvailability({
    range,
    trackDurationMs,
  });

  return (
    <View style={[styles.cardRow, isLoading ? styles.disabled : null]}>
      <EdgeCard
        boundary="start"
        disabled={{
          earlier: isLoading || availability.startEarlier,
          later: isLoading || availability.startLater,
        }}
        label="Start"
        onNudgeBoundary={onNudgeBoundary}
        valueMs={range.startMs}
      />
      <View style={[styles.card, styles.cardLength]}>
        <Text style={styles.cardLabel}>Length</Text>
        <Text style={[styles.cardValue, styles.cardValueAccent]}>
          {formatLoopEditorPrecise(Math.max(0, range.endMs - range.startMs))}
        </Text>
      </View>
      <EdgeCard
        boundary="end"
        disabled={{
          earlier: isLoading || availability.endEarlier,
          later: isLoading || availability.endLater,
        }}
        label="End"
        onNudgeBoundary={onNudgeBoundary}
        valueMs={range.endMs}
      />
    </View>
  );
};
