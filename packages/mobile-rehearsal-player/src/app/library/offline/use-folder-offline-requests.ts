import { useEffect } from 'react';

import type { BulkSelectionItem } from '../selection/playback-expansion';
import { subscribeToFolderOfflineRequests } from './folder-offline-request';

type FolderOfflineRun = {
  keepOffline: (items: readonly BulkSelectionItem[]) => void;
  removeOffline: (items: readonly BulkSelectionItem[]) => void;
};

/**
 * Runs a Files folder row's `Keep offline` / `Remove from offline` on that
 * folder alone, whatever is selected.
 */
export const useFolderOfflineRequests = ({
  keepOffline,
  removeOffline,
}: FolderOfflineRun) => {
  useEffect(() => {
    return subscribeToFolderOfflineRequests((request) => {
      const folderItem: BulkSelectionItem[] = [
        {
          folderId: request.folderId,
          key: `folder:${request.folderId}`,
          kind: 'folder',
        },
      ];

      if (request.action === 'keep-offline') {
        keepOffline(folderItem);
      } else {
        removeOffline(folderItem);
      }
    });
  }, [keepOffline, removeOffline]);
};
