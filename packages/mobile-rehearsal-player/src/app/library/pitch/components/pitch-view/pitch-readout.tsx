import { Pressable, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../../../utils/theme';
import type { MonitorAction } from '../../view/pitch-monitor-model';
import type { ViewReadout } from '../../view/pitch-view-model';
import { ZONE_COLORS } from '../../view/pitch-zone-colors';

type PitchReadoutProps = {
  readout: ViewReadout;
  onAction: (action: MonitorAction) => void;
};

const { colors, space } = appTheme;
const NOTE_FONT_SIZE = 42;

/** The large readout: the note, its distance and the zone in words. */
export const PitchReadout = ({ readout, onAction }: PitchReadoutProps) => {
  if (readout.kind === 'note') {
    const colour = ZONE_COLORS[readout.zone];

    return (
      <View
        accessibilityLabel={readout.spokenLabel}
        accessibilityRole="image"
        style={styles.row}
      >
        <Text style={styles.note}>{readout.name}</Text>
        <Text style={styles.distance}>{readout.distanceText}</Text>
        <Text
          style={[
            styles.zone,
            { color: colour.stroke, backgroundColor: colour.fill },
            { borderColor: colour.stroke },
          ]}
        >
          {readout.zoneLabel}
        </Text>
      </View>
    );
  }

  if (readout.kind === 'idle') {
    return (
      <View style={styles.row}>
        <Text style={styles.idleTitle}>{readout.title}</Text>
        <Text style={styles.distance}>{readout.detail}</Text>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text
        style={[
          styles.messageTitle,
          readout.tone === 'warning' ? styles.messageWarning : null,
        ]}
      >
        {readout.title}
      </Text>
      <Text style={styles.messageDetail}>{readout.detail}</Text>
      {readout.action ? (
        <Pressable
          accessibilityLabel={readout.action.label}
          accessibilityRole="button"
          onPress={() => onAction(readout.action?.kind ?? 'listen')}
          style={styles.action}
        >
          <Text style={styles.actionLabel}>{readout.action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 58,
    paddingHorizontal: space.lg,
    paddingBottom: space.xs,
  },
  note: {
    color: colors.text,
    fontSize: NOTE_FONT_SIZE,
    fontWeight: appTheme.fontWeight.medium,
    lineHeight: NOTE_FONT_SIZE + 4,
  },
  distance: { color: colors.textMuted, fontSize: 13 },
  zone: {
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderRadius: appTheme.radius.pill,
    fontSize: 12,
  },
  idleTitle: { color: colors.textFaint, fontSize: 24 },
  messageTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: appTheme.fontWeight.medium,
  },
  messageWarning: { color: colors.warning },
  messageDetail: { flexShrink: 1, color: colors.textMuted, fontSize: 13 },
  action: {
    minHeight: appTheme.space.touchTarget,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: appTheme.radius.pill,
  },
  actionLabel: { color: colors.accentText, fontSize: 13 },
});
