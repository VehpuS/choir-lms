import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useRef } from 'react';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import {
  subscribeToSavedItemRequests,
  type SavedItemRequest,
} from '../components/saved-item-menu/saved-item-requests';
import { keepSourceOffline, removeSourceOffline } from './offline-actions';

const TOO_LARGE_MESSAGE =
  'The file is larger than the offline cache size, so it was not kept.';

type OfflineRequestHandlerOptions = {
  accessToken?: string;
  clearIssue: () => void;
  reportIssue: (source: DriveLibrarySource, error: unknown) => void;
  savedLibrarySources: readonly DriveLibrarySource[];
  savedLoops: readonly NamedLoop[];
};

const findSource = (
  request: SavedItemRequest,
  options: OfflineRequestHandlerOptions,
) => {
  if (request.kind === 'track') {
    return options.savedLibrarySources.find(({ id }) => id === request.id);
  }

  // A loop plays its track's file, so it keeps that file.
  const loop = options.savedLoops.find(({ id }) => id === request.id);

  return options.savedLibrarySources.find(({ id }) => id === loop?.sourceId);
};

/**
 * Runs `Keep offline` / `Remove from offline` for menus anywhere in the app.
 * A failed keep is reported through the saved library's issue, the same
 * place a failed save or removal appears.
 */
export const useOfflineRequestHandler = (
  options: OfflineRequestHandlerOptions,
) => {
  const latest = useRef(options);

  latest.current = options;

  useEffect(() => {
    return subscribeToSavedItemRequests((request) => {
      if (
        request.action !== 'keep-offline' &&
        request.action !== 'remove-offline'
      ) {
        return;
      }

      const current = latest.current;
      const source = findSource(request, current);

      if (!source) {
        return;
      }

      if (request.action === 'remove-offline') {
        void removeSourceOffline(source.driveFileId);

        return;
      }

      if (!current.accessToken) {
        current.reportIssue(
          source,
          new Error('Reconnect Google Drive and try again.'),
        );

        return;
      }

      current.clearIssue();
      keepSourceOffline(source, current.accessToken).then(
        (result) => {
          if (result === 'too-large') {
            current.reportIssue(source, new Error(TOO_LARGE_MESSAGE));
          }
        },
        (error: unknown) => {
          current.reportIssue(source, error);
        },
      );
    });
  }, []);
};
