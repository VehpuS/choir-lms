import { StyleSheet, Text } from 'react-native';

import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { getOriginalDriveLocationViewModel } from '../../saved-rehearsal-library/original-drive-location-view-model';
import { appTheme } from '../../../utils/theme';

const LINE_HEIGHT = 17;

/**
 * The `From <path>` line under a saved track's menu title, in every view
 * that shows the shared track menu. It wraps so a deep Drive path stays
 * readable in full, and is omitted until the original location is known.
 */
export const SavedTrackMenuProvenance = ({
  source,
}: {
  source: Pick<DriveLibrarySource, 'sourceLocation'>;
}) => {
  const originalLocation = getOriginalDriveLocationViewModel(source);

  if (!originalLocation.hasKnownPath) {
    return null;
  }

  return <Text style={styles.label}>From {originalLocation.pathLabel}</Text>;
};

const styles = StyleSheet.create({
  label: {
    ...appTheme.type.rowMeta,
    lineHeight: LINE_HEIGHT,
  },
});
