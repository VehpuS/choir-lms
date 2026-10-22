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
import { ariaStateProps } from '../../../../components/aria-state';

const NUDGE_ICON_SIZE = 18;

type Nudge = (
  boundary: LoopBuilderBoundary,
  direction: 'earlier' | 'later',
) => void;

type LoopEditorRangeCardsProps = {
  /** The card the next marker pick will set, shown with an accent outline. */
  armedBoundary?: LoopBuilderBoundary | null;
  /** Taps on a card's label and time arm it for a marker pick. */
  onToggleArm?: (boundary: LoopBuilderBoundary) => void;
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
      {...ariaStateProps({ disabled })}
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
  isArmed,
  label,
  onNudgeBoundary,
  onToggleArm,
  valueMs,
}: {
  boundary: LoopBuilderBoundary;
  isArmed: boolean;
  onToggleArm?: (boundary: LoopBuilderBoundary) => void;
  disabled: { earlier: boolean; later: boolean };
  label: string;
  onNudgeBoundary: Nudge;
  valueMs: number;
}) => {
  return (
    <View style={[styles.card, isArmed ? styles.cardArmed : null]}>
      <Pressable
        accessibilityHint={
          isArmed ? 'Pick a marker to set it' : 'Arms this edge for a marker'
        }
        accessibilityLabel={`${label}, ${formatLoopEditorPrecise(valueMs)}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isArmed }}
        {...ariaStateProps({ selected: isArmed }, 'button')}
        {...interactionGuardProps}
        disabled={!onToggleArm}
        onPress={() => {
          onToggleArm?.(boundary);
        }}
        style={styles.cardHeader}
      >
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardValue}>{formatLoopEditorPrecise(valueMs)}</Text>
      </Pressable>
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
  armedBoundary = null,
  isLoading,
  onToggleArm,
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
        isArmed={armedBoundary === 'start'}
        label="Start"
        onNudgeBoundary={onNudgeBoundary}
        onToggleArm={onToggleArm}
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
        isArmed={armedBoundary === 'end'}
        label="End"
        onNudgeBoundary={onNudgeBoundary}
        onToggleArm={onToggleArm}
        valueMs={range.endMs}
      />
    </View>
  );
};
