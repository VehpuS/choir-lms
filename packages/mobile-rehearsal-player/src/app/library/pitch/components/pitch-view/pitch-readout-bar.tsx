import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppIcon } from '../../../../components/app-icon';
import { ariaStateProps } from '../../../../components/aria-state';
import { monoFontFamily } from '../../../../utils/mono-font-family';
import { appTheme } from '../../../../utils/theme';
import type { ReadoutBar } from '../../view/pitch-view-model';

type PitchReadoutBarProps = {
  bar: ReadoutBar;
  onToggleListening: () => void;
};

const { colors, space } = appTheme;
const DOT_SIZE = 9;
const MIC_ICON_SIZE = 22;
const STATUS_COLORS = {
  ok: colors.success,
  warn: colors.warning,
  off: colors.textFaint,
} as const;

const Value = ({ label, value }: { label: string; value: string }) => (
  <View>
    <Text style={styles.kicker}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

/** Pitch, confidence, the listening toggle and state. */
export const PitchReadoutBar = ({
  bar,
  onToggleListening,
}: PitchReadoutBarProps) => {
  const isListening = bar.listenLabel === 'Stop';

  return (
    <View style={styles.bar}>
      <Value label="PITCH" value={bar.pitchText} />
      <Value label="CONFIDENCE" value={bar.confidenceText} />
      <Pressable
        accessibilityLabel={bar.listenLabel}
        accessibilityRole="button"
        {...ariaStateProps({ selected: isListening })}
        onPress={onToggleListening}
        style={[styles.listen, isListening ? styles.listenOn : null]}
      >
        <AppIcon
          color={isListening ? colors.text : colors.textMuted}
          name="microphone-outline"
          size={MIC_ICON_SIZE}
        />
        <Text style={styles.listenLabel}>{bar.listenLabel}</Text>
      </Pressable>
      <View
        accessibilityLabel={`State: ${bar.statusText}`}
        style={styles.status}
      >
        <View
          style={[
            styles.dot,
            { backgroundColor: STATUS_COLORS[bar.statusTone] },
          ]}
        />
        <Text style={styles.statusText}>{bar.statusText}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    minHeight: 64,
    paddingHorizontal: space.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  kicker: { color: colors.textFaint, fontSize: 9.5, letterSpacing: 1 },
  value: {
    color: colors.text,
    fontFamily: monoFontFamily,
    fontSize: 13,
    fontWeight: appTheme.fontWeight.medium,
  },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: appTheme.space.touchTarget,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: appTheme.radius.pill,
    backgroundColor: colors.surface,
  },
  listenOn: {
    borderColor: colors.success,
    backgroundColor: colors.successFill,
  },
  listenLabel: { color: colors.text, fontSize: 13 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: DOT_SIZE / 2 },
  statusText: { color: colors.textMuted, fontSize: 12 },
});
