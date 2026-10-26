import { StyleSheet, Text, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import { SegmentedControl } from '../../components/segmented-control';
import {
  bulkChoicePreferencesStore,
  useBulkChoicePreferences,
} from '../../library/selection/bulk-choice-preferences-store';
import { appTheme } from '../../utils/theme';
import {
  SETTINGS_COPY,
  SETTINGS_PREFERENCE_ROWS,
  hasStoredBulkChoiceDefault,
} from './model';

// The one place stored defaults are shown and reset, so a default that skips
// its prompt is never invisible (design "Bulk action preferences").
export const BulkSelectionsSection = () => {
  const preferences = useBulkChoicePreferences();

  return (
    <View style={styles.section}>
      <Text style={styles.sectionBody}>{SETTINGS_COPY.sectionBody}</Text>
      {SETTINGS_PREFERENCE_ROWS.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.rowTitle}>{row.title}</Text>
          <Text style={styles.rowBody}>{row.body}</Text>
          <SegmentedControl
            accessibilityLabel={row.title}
            onSelect={(value) => {
              void bulkChoicePreferencesStore.update({ [row.key]: value });
            }}
            options={row.options}
            selectedValue={preferences[row.key]}
          />
        </View>
      ))}
      <OutlinedActionButton
        disabled={!hasStoredBulkChoiceDefault(preferences)}
        label={SETTINGS_COPY.resetLabel}
        onPress={() => {
          void bulkChoicePreferencesStore.reset();
        }}
        variant="neutral"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: appTheme.space.xs,
  },
  rowBody: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  section: {
    gap: appTheme.space.lg,
  },
  sectionBody: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
});
