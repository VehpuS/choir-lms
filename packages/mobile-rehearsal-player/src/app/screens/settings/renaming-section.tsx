import { StyleSheet, Text, View } from 'react-native';

import { SegmentedControl } from '../../components/segmented-control';
import {
  trackRenameChoiceStore,
  useTrackRenameCopiesChoice,
} from '../../library/saved-rehearsal-library/track-rename-choice-store';
import type { TrackRenameCopiesChoice } from '../../library/saved-rehearsal-library/track-rename-model';
import { appTheme } from '../../utils/theme';
import { RENAMING_COPY, RENAMING_OPTIONS } from './model';

const ASK_VALUE = 'ask';

/** The segmented-control value for a stored choice (`null` asks each time). */
export const renamingOptionValue = (choice: TrackRenameCopiesChoice | null) =>
  choice ?? ASK_VALUE;

/** The choice to store for a segmented-control value; `ask` clears it. */
export const renamingChoiceFromValue = (
  value: string,
): TrackRenameCopiesChoice | null =>
  value === 'all' || value === 'this' ? value : null;

// Where the answer remembered in the Files rename prompt is shown, changed or
// cleared, so a choice that skips the prompt is never invisible.
export const RenamingSection = () => {
  const choice = useTrackRenameCopiesChoice();

  return (
    <View style={styles.section}>
      <Text style={styles.body}>{RENAMING_COPY.body}</Text>
      <View style={styles.row}>
        <Text style={styles.rowTitle}>{RENAMING_COPY.rowTitle}</Text>
        <SegmentedControl
          accessibilityLabel={RENAMING_COPY.rowTitle}
          onSelect={(value) => {
            void trackRenameChoiceStore.set(renamingChoiceFromValue(value));
          }}
          options={RENAMING_OPTIONS}
          selectedValue={renamingOptionValue(choice)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  body: {
    color: appTheme.colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  row: {
    gap: appTheme.space.xs,
  },
  rowTitle: {
    color: appTheme.colors.text,
    fontSize: 15,
    fontWeight: appTheme.fontWeight.medium,
  },
  section: {
    gap: appTheme.space.lg,
  },
});
