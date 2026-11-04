import { LARGE_NUDGE_MS } from '@org/audio-mixing';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { buttonInteractionGuardStyle } from '../../../components/interaction-guard';
import { appTheme } from '../../../utils/theme';
import type { PunchPointView } from './punch-sheet-model';

const { colors, radius, space, type } = appTheme;
const MIN_FIELD_WIDTH = 72;

export const StepButton = ({
  accessibilityLabel,
  label,
  onPress,
}: {
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
}) => (
  <Pressable
    accessibilityLabel={accessibilityLabel}
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [
      styles.step,
      buttonInteractionGuardStyle,
      pressed ? styles.pressed : null,
    ]}
  >
    <Text style={styles.stepLabel}>{label}</Text>
  </Pressable>
);

/** One of the two points: its typed time, the marker it is near, and the one-second nudges. */
export const PointRow = ({
  label,
  onNudge,
  onType,
  view,
}: {
  label: 'In' | 'Out';
  onNudge: (deltaMs: number) => void;
  onType: (text: string) => void;
  view: PunchPointView;
}) => {
  // The typed text, committed when editing ends, on Return or on blur.
  const typed = useRef(view.text);
  const lastShown = useRef(view.text);

  if (lastShown.current !== view.text) {
    lastShown.current = view.text;
    typed.current = view.text;
  }

  // Untouched text is not committed: it shows tenths, and would round the point.
  const commit = () => {
    if (typed.current !== view.text) {
      onType(typed.current);
    }
  };

  return (
    <View style={styles.pointRow}>
      <Text style={styles.pointKey}>{label.toUpperCase()}</Text>
      <TextInput
        accessibilityLabel={`${label} time`}
        autoCorrect={false}
        // Remounted when the point moves, so a drag or nudge shows its new time.
        defaultValue={view.text}
        key={view.text}
        onBlur={commit}
        onChangeText={(text) => {
          typed.current = text;
        }}
        onEndEditing={commit}
        onSubmitEditing={commit}
        style={styles.pointInput}
      />
      <Text numberOfLines={1} style={styles.pointNear}>
        {view.near ?? ''}
      </Text>
      <StepButton
        accessibilityLabel={`${label} 1 second earlier`}
        label="−1s"
        onPress={() => onNudge(-LARGE_NUDGE_MS)}
      />
      <StepButton
        accessibilityLabel={`${label} 1 second later`}
        label="+1s"
        onPress={() => onNudge(LARGE_NUDGE_MS)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pointInput: {
    borderColor: colors.borderChip,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontVariant: ['tabular-nums'],
    minHeight: space.touchTarget,
    minWidth: MIN_FIELD_WIDTH,
    paddingHorizontal: space.sm,
  },
  pointKey: { ...type.sectionHead, color: colors.textMuted },
  pointNear: { ...type.rowMeta, color: colors.textMuted, flex: 1 },
  pointRow: { alignItems: 'center', flexDirection: 'row', gap: space.sm },
  pressed: { opacity: 0.7 },
  step: {
    alignItems: 'center',
    borderColor: colors.borderChip,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: space.touchTarget,
    minWidth: space.touchTarget,
    paddingHorizontal: space.sm,
  },
  stepLabel: { ...type.rowMeta, color: colors.accentText },
});
