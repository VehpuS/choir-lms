import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { DestinationHeader } from '../../components/destination-header';
import { OutlinedActionButton } from '../../components/outlined-action-button';
import { SegmentedControl } from '../../components/segmented-control';
import { SurfaceIconButton } from '../../components/surface-icon-button';
import {
  bulkChoicePreferencesStore,
  useBulkChoicePreferences,
} from '../../library/selection/bulk-choice-preferences-store';
import { scrollGutterStyles } from '../../components/scroll-gutter';
import { appTheme } from '../../utils/theme';
import {
  SETTINGS_COPY,
  SETTINGS_PREFERENCE_ROWS,
  hasStoredBulkChoiceDefault,
} from './model';
import { settingsNavigationStore } from './settings-navigation-store';

// The one place stored defaults are shown and reset, so a default that skips
// its prompt is never invisible (design "Bulk action preferences").
export const SettingsScreen = () => {
  const preferences = useBulkChoicePreferences();

  return (
    <View style={styles.screen}>
      <DestinationHeader
        title={SETTINGS_COPY.title}
        trailingAction={
          <SurfaceIconButton
            accessibilityLabel={SETTINGS_COPY.closeLabel}
            icon="close"
            onPress={settingsNavigationStore.close}
          />
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, scrollGutterStyles.content]}
        style={scrollGutterStyles.scrollView}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{SETTINGS_COPY.sectionTitle}</Text>
          <Text style={styles.sectionBody}>{SETTINGS_COPY.sectionBody}</Text>
        </View>
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: appTheme.space.lg,
    paddingBottom: appTheme.space.xl,
  },
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
  screen: {
    backgroundColor: appTheme.colors.bg,
    flex: 1,
    paddingHorizontal: appTheme.space.screenInset,
  },
  section: {
    gap: appTheme.space.xs,
  },
  sectionBody: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  sectionTitle: {
    color: appTheme.colors.text,
    fontSize: 17,
    fontWeight: appTheme.fontWeight.medium,
  },
});
