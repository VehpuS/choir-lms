import { StyleSheet, Text, View } from 'react-native';

import { SegmentedControl } from '../../components/segmented-control';
import { pianoCapabilities } from '../../library/piano/piano-capabilities';
import {
  setPianoPreferences,
  usePianoPreferences,
} from '../../library/piano/piano-preferences';
import { appTheme } from '../../utils/theme';
import {
  PIANO_PREFERENCE_ROWS,
  PIANO_SETTINGS_COPY,
  pianoPreferencePatch,
  pianoPreferenceValue,
} from './model';

/** Sound and label choices for the piano; absent where the piano cannot play. */
export const PianoSection = () => {
  const preferences = usePianoPreferences();

  if (!pianoCapabilities().canPlay) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.body}>{PIANO_SETTINGS_COPY.body}</Text>
      {PIANO_PREFERENCE_ROWS.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <Text style={styles.body}>{row.body}</Text>
          <SegmentedControl
            accessibilityLabel={row.title}
            onSelect={(value) => {
              setPianoPreferences(pianoPreferencePatch(row.key, value));
            }}
            options={row.options}
            selectedValue={pianoPreferenceValue(preferences, row.key)}
          />
          {/* The recordings are the Piano sound, so their credit sits with it. */}
          {row.key === 'sound' ? (
            <Text style={styles.credit}>{PIANO_SETTINGS_COPY.credit}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  credit: {
    color: appTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 16,
  },
  row: { gap: appTheme.space.xs },
  rowTitle: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  section: { gap: appTheme.space.sm },
});
