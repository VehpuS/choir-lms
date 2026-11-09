import { StyleSheet, View } from 'react-native';

import { OutlinedActionButton } from '../../components/outlined-action-button';
import type { PreparedCompositesSummary } from '../../library/composite/prepared/prepared-composites-model';
import type { OfflineFileRow } from '../../library/offline/offline-storage-model';
import type { OfflineStorageService } from '../../library/offline/offline-storage-service';
import type { LibraryFilesConfirmationDialogContent } from '../../library/selection/library-files-confirmation-dialog';
import { appTheme } from '../../utils/theme';
import {
  OFFLINE_FILES_COPY,
  getClearAllConfirmation,
  getClearAutomaticConfirmation,
} from './model';

type OfflineFilesFooterProps = {
  allRows: readonly OfflineFileRow[];
  automaticRows: readonly OfflineFileRow[];
  prepared: {
    clearAll: () => Promise<void>;
    summary: PreparedCompositesSummary;
  };
  requestConfirmation: (options: {
    content: LibraryFilesConfirmationDialogContent;
    onConfirm: () => Promise<void> | void;
  }) => void;
  service: OfflineStorageService;
};

/**
 * `Clear automatic cache` and `Clear all`. `Clear all` also clears the prepared
 * composite stems, and its confirmation says so (composite-tracks 9.1).
 */
export const OfflineFilesFooter = ({
  allRows,
  automaticRows,
  prepared,
  requestConfirmation,
  service,
}: OfflineFilesFooterProps) => (
  <View style={styles.footerActions}>
    <OutlinedActionButton
      disabled={automaticRows.length === 0}
      label={OFFLINE_FILES_COPY.clearAutomaticLabel}
      onPress={() => {
        requestConfirmation({
          content: getClearAutomaticConfirmation(automaticRows),
          onConfirm: service.clearAutomatic,
        });
      }}
      variant="neutral"
    />
    <OutlinedActionButton
      label={OFFLINE_FILES_COPY.clearAllLabel}
      onPress={() => {
        requestConfirmation({
          content: getClearAllConfirmation(allRows, prepared.summary),
          onConfirm: async () => {
            await service.clearAll();
            await prepared.clearAll();
          },
        });
      }}
      variant="destructive"
    />
  </View>
);

const styles = StyleSheet.create({
  footerActions: {
    gap: appTheme.space.sm,
  },
});
