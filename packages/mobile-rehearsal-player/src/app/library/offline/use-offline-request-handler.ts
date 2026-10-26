import type { NamedLoop } from '@org/audio-library-models';
import { useEffect, useRef } from 'react';

import type { DriveAudioSource } from '@org/audio-library-models';
import {
  subscribeToSavedItemRequests,
  type SavedItemRequest,
} from '../components/saved-item-menu/saved-item-requests';
import { keepSourceOffline, removeSourceOffline } from './offline-actions';
import { keepManyOffline, setOfflineBatchRunner } from './offline-batch';

const NOT_STORED_MESSAGE =
  'This device could not store the file. Its storage may be full.';

type OfflineRequestHandlerOptions = {
  accessToken?: string;
  clearIssue: () => void;
  reportIssue: (source: DriveAudioSource, error: unknown) => void;
  savedLibrarySources: readonly DriveAudioSource[];
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

  // Bulk and folder actions run through this runner, which holds the session.
  useEffect(() => {
    setOfflineBatchRunner({
      keepSources: (sources) => {
        const { accessToken } = latest.current;

        if (!accessToken) {
          return Promise.reject(
            new Error('Reconnect Google Drive and try again.'),
          );
        }

        return keepManyOffline(sources, (source) =>
          keepSourceOffline(source, accessToken),
        );
      },
      removeSources: async (sources) => {
        await Promise.all(
          sources.map((source) => removeSourceOffline(source.driveFileId)),
        );
      },
    });

    return () => {
      setOfflineBatchRunner(null);
    };
  }, []);

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
          if (result === 'not-stored') {
            current.reportIssue(source, new Error(NOT_STORED_MESSAGE));
          }
        },
        (error: unknown) => {
          current.reportIssue(source, error);
        },
      );
    });
  }, []);
};
