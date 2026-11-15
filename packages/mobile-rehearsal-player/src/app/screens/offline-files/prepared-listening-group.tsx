import { StyleSheet, Text, View } from 'react-native';

import {
  PREPARED_LISTENING_COPY,
  type PreparedListeningSummary,
} from '../../library/playback/listening-engine/prepared-listening-model';
import { appTheme } from '../../utils/theme';

type PreparedListeningGroupProps = {
  summary: PreparedListeningSummary;
};

/**
 * Audio prepared for single tracks in its own group, next to the prepared
 * composites: each track with its size. It is a cache with a size limit that
 * `Clear all` clears and that is made again when the track is next played with
 * the microphone on, so there is no per-row action.
 */
export const PreparedListeningGroup = ({
  summary,
}: PreparedListeningGroupProps) => {
  if (summary.count === 0) {
    return null;
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>
        {PREPARED_LISTENING_COPY.groupTitle}
      </Text>
      <Text style={styles.groupLine}>{summary.groupLine}</Text>
      {summary.rows.map((row) => (
        <View key={row.ownerId} style={styles.row}>
          <Text numberOfLines={1} style={styles.name}>
            {row.name}
          </Text>
          <Text style={styles.size}>{row.sizeLabel}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  groupLine: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    paddingBottom: appTheme.space.xs,
  },
  name: {
    color: appTheme.colors.text,
    flex: 1,
    fontSize: 16,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: appTheme.colors.borderSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: appTheme.space.md,
    minHeight: 56,
    paddingVertical: appTheme.space.sm,
  },
  sectionTitle: {
    ...appTheme.type.kicker,
    color: appTheme.colors.textMuted,
    paddingBottom: appTheme.space.xs,
  },
  size: {
    color: appTheme.colors.textMuted,
    fontSize: 14,
  },
});
