import { StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../utils/theme';
import type { MonitorNote } from '../view/pitch-monitor-model';

const { colors, space } = appTheme;
const SPARK_HEIGHT = 40;
const SPARK_DOT = 3;
const GAUGE_THUMB_WIDTH = 12;

type PitchMonitorNoteProps = {
  note: MonitorNote;
  sparkline: readonly (number | null)[];
};

/** The note, its cents, the gauge and the sparkline: one labelled readout. */
export const PitchMonitorNote = ({
  note,
  sparkline,
}: PitchMonitorNoteProps) => {
  const isPrecise = note.zone === 'precise';

  return (
    <View
      accessibilityLabel={note.spokenLabel}
      accessibilityRole="image"
      style={styles.row}
    >
      <View style={styles.noteColumn}>
        <Text style={styles.noteName}>{note.name}</Text>
        <Text style={styles.cents}>{`${note.centsText} cents`}</Text>
      </View>
      <View style={styles.gaugeColumn}>
        <View style={styles.gaugeBar}>
          <View style={styles.gaugeCentre} />
          <View
            style={[
              styles.gaugeThumb,
              isPrecise ? styles.gaugeThumbPrecise : null,
              { left: `${note.gauge * 100}%` },
            ]}
          />
        </View>
        <View style={styles.gaugeScale}>
          <Text style={styles.scaleLabel}>-50</Text>
          <Text style={styles.scaleLabel}>0</Text>
          <Text style={styles.scaleLabel}>+50</Text>
        </View>
      </View>
      <View style={styles.spark}>
        {sparkline.map((value, index) =>
          value === null ? null : (
            <View
              // The buckets are positional, so the index is the identity.
              key={index}
              style={[
                styles.sparkDot,
                {
                  left: `${(index / sparkline.length) * 100}%`,
                  bottom: value * (SPARK_HEIGHT - SPARK_DOT),
                },
              ]}
            />
          ),
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  noteColumn: { width: 74 },
  noteName: {
    color: colors.text,
    fontSize: 30,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: 32,
  },
  cents: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  gaugeColumn: { flex: 1, minWidth: 0, gap: 5 },
  gaugeBar: {
    height: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
  gaugeCentre: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: '50%',
    width: 1.5,
    backgroundColor: colors.textFaint,
  },
  gaugeThumb: {
    position: 'absolute',
    top: -4,
    width: GAUGE_THUMB_WIDTH,
    height: 14,
    marginLeft: -GAUGE_THUMB_WIDTH / 2,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  gaugeThumbPrecise: { backgroundColor: colors.success },
  gaugeScale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleLabel: { color: colors.textFaint, fontSize: 9.5 },
  spark: { width: 78, height: SPARK_HEIGHT },
  sparkDot: {
    position: 'absolute',
    width: SPARK_DOT,
    height: SPARK_DOT,
    borderRadius: SPARK_DOT / 2,
    backgroundColor: colors.accentText,
  },
});
