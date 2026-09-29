import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '../../components/segmented-control';
import { SectionHeading } from '../../library/components/section-heading';
import type { DriveImportMode } from '../../library/saved-rehearsal-library/drive-import-planner';
import { appTheme } from '../../utils/theme';
import { getDriveImportReviewModeCopy } from './screen-copy';

type ModePickerSectionProps = {
  mode: DriveImportMode;
  onSelectMode: (mode: DriveImportMode) => void;
};

// `Preserve structure` / `Flatten` as 1j's segmented control under a kicker.
export const ModePickerSection = ({
  mode,
  onSelectMode,
}: ModePickerSectionProps) => {
  const copy = getDriveImportReviewModeCopy();

  return (
    <View style={styles.section}>
      <SectionHeading eyebrow={copy.title} />
      <SegmentedControl<DriveImportMode>
        accessibilityLabel={copy.title}
        onSelect={onSelectMode}
        options={[
          { label: copy.preserveStructureLabel, value: 'preserve-structure' },
          { label: copy.flattenLabel, value: 'flatten' },
        ]}
        selectedValue={mode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: appTheme.space.sm,
  },
});
