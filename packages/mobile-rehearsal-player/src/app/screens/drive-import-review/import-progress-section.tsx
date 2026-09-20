import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { appTheme } from '../../utils/theme';
import type { DriveImportProgress } from '../../library/saved-rehearsal-library/drive-import-status';
import { getDriveImportProgressCopy } from './drive-import-progress-model';

type ImportProgressSectionProps = {
  progress: DriveImportProgress;
};

export const ImportProgressSection = ({
  progress,
}: ImportProgressSectionProps) => {
  const copy = getDriveImportProgressCopy(progress);

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        <ActivityIndicator
          accessibilityLabel="Import in progress"
          color={appTheme.colors.listMarker}
        />
        <Text style={styles.label}>{copy.phaseLabel}</Text>
      </View>
      <Text style={styles.helper}>
        {copy.totalItems === null
          ? `${copy.completedItems} items done`
          : `${copy.completedItems} of ${copy.totalItems}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  helper: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
  },
  label: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  section: {
    gap: 6,
  },
});
