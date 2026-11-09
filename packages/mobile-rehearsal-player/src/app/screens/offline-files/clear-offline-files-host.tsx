import { useEffect } from 'react';

import { getPreparedStemStore } from '../../library/composite/prepared/prepared-stem-instance';
import { subscribeToClearOfflineFilesRequests } from '../../library/offline/clear-offline-files-request';
import { buildOfflineStorageSnapshot } from '../../library/offline/offline-storage-model';
import { offlineStorageService } from '../../library/offline/offline-storage-instance';
import { audioCacheBudgetStore } from '../../library/playback/audio-cache/audio-cache-budget';
import { useLibraryFilesConfirmationFlow } from '../../library/selection/use-library-files-confirmation-flow';
import { resolveClearOfflineFilesPlan } from './clear-offline-files-plan';

/**
 * Shows the `Clear all` confirmation when a no-room message asks for it, clears
 * the offline files and the prepared composite stems on confirm, and then lets
 * the asker retry (composite-tracks 9.2).
 */
export const ClearOfflineFilesHost = () => {
  const { confirmationDialog, requestConfirmation } =
    useLibraryFilesConfirmationFlow();

  useEffect(() => {
    return subscribeToClearOfflineFilesRequests((request) => {
      void (async () => {
        const store = getPreparedStemStore();
        const [entries, usage] = await Promise.all([
          offlineStorageService.list(),
          store.listComposites(),
        ]);
        const snapshot = buildOfflineStorageSnapshot({
          budgetBytes: audioCacheBudgetStore.get(),
          entries,
          libraryNames: new Map(),
          sort: 'recent',
        });
        const plan = resolveClearOfflineFilesPlan(
          [...snapshot.kept, ...snapshot.automatic],
          {
            count: usage.length,
            totalBytes: usage.reduce(
              (sum, { sizeBytes }) => sum + sizeBytes,
              0,
            ),
          },
        );

        requestConfirmation({
          content: plan.content,
          onConfirm: async () => {
            if (!plan.clears) {
              return;
            }

            await offlineStorageService.clearAll();
            await store.deleteAll();
            request.onCleared?.();
          },
        });
      })();
    });
  }, [requestConfirmation]);

  return confirmationDialog;
};
