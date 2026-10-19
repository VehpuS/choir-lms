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
      <Text style={styles.sectionTitle}>
        {PIANO_SETTINGS_COPY.sectionTitle}
      </Text>
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
  row: { gap: appTheme.space.xs },
  rowTitle: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  section: { gap: appTheme.space.sm },
  sectionTitle: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
  },
});
