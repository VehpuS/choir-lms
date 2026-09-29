import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { DriveImportProgress } from '../../library/saved-rehearsal-library/drive-import-status';
import { appTheme } from '../../utils/theme';
import {
  getDriveImportProgressCopy,
  getDriveImportProgressRatio,
} from './drive-import-progress-model';

const { colors, space } = appTheme;

const PROGRESS_LINE_HEIGHT = 2;
const PERCENT = 100;

type ImportProgressSectionProps = {
  progress: DriveImportProgress;
};

// Phased import progress: the phase as a row title, the monospace count, and
// a 2px accent line (the mini-player's progress treatment) once the total is
// known. Before that the spinner is the only claim the screen makes.
export const ImportProgressSection = ({
  progress,
}: ImportProgressSectionProps) => {
  const copy = getDriveImportProgressCopy(progress);
  const ratio = getDriveImportProgressRatio(progress);

  return (
    <View style={styles.section}>
      <View style={styles.row}>
        {ratio === null ? (
          <ActivityIndicator
            accessibilityLabel="Import in progress"
            color={colors.accent}
          />
        ) : null}
        <Text style={styles.label}>{copy.phaseLabel}</Text>
        <Text style={styles.count}>
          {copy.totalItems === null
            ? `${copy.completedItems} items done`
            : `${copy.completedItems} of ${copy.totalItems}`}
        </Text>
      </View>
      {ratio === null ? null : (
        // `aria-value*` rather than `accessibilityValue`: react-native-web does
        // not map the latter, and React Native reads both forms natively.
        <View
          accessibilityLabel={`${copy.phaseLabel}: ${copy.completedItems} of ${copy.totalItems}`}
          aria-valuemax={copy.totalItems ?? undefined}
          aria-valuemin={0}
          aria-valuenow={copy.completedItems}
          role="progressbar"
          style={styles.track}
        >
          <View style={[styles.fill, { width: `${ratio * PERCENT}%` }]} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  count: {
    ...appTheme.type.timecode,
    fontSize: appTheme.type.rowMeta.fontSize,
  },
  fill: {
    height: PROGRESS_LINE_HEIGHT,
    backgroundColor: colors.accent,
  },
  label: {
    ...appTheme.type.rowTitle,
    flex: 1,
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  section: {
    gap: space.sm,
  },
  track: {
    height: PROGRESS_LINE_HEIGHT,
    overflow: 'hidden',
    backgroundColor: colors.hairline,
  },
});
