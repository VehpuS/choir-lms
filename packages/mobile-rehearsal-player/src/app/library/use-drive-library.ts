import {
  listDriveLibrary,
  type DriveAuthorizationState,
  type DriveLibrarySnapshot,
} from '@org/google-drive';
import { useEffect, useState } from 'react';

import { runtimeConfig } from '../../config/runtime';

const EMPTY_LIBRARY: DriveLibrarySnapshot = {
  playableSources: [],
  unavailableSources: [],
};

const DEFAULT_LIBRARY_ERROR = 'Drive library could not be loaded.';

export const useDriveLibrary = (authState: DriveAuthorizationState) => {
  const [snapshot, setSnapshot] = useState<DriveLibrarySnapshot>(EMPTY_LIBRARY);
  const [isLoading, setIsLoading] = useState(false);
  const [issue, setIssue] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (authState.status !== 'authorized' || !authState.accessToken) {
      setSnapshot(EMPTY_LIBRARY);
      setIssue(null);
      setIsLoading(false);
      return;
    }

    let isDisposed = false;
    const abortController = new AbortController();

    setIsLoading(true);
    setIssue(null);

    void listDriveLibrary({
      accessToken: authState.accessToken,
      supportedMimeTypes: runtimeConfig.supportedAudioMimeTypes,
      supportedExtensions: runtimeConfig.supportedAudioExtensions,
      signal: abortController.signal,
    })
      .then((nextSnapshot) => {
        if (isDisposed) {
          return;
        }

        setSnapshot(nextSnapshot);
      })
      .catch((error: unknown) => {
        if (isDisposed) {
          return;
        }

        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        setIssue(
          error instanceof Error ? error.message : DEFAULT_LIBRARY_ERROR,
        );
      })
      .finally(() => {
        if (isDisposed) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isDisposed = true;
      abortController.abort();
    };
  }, [authState.accessToken, authState.status, refreshCount]);

  return {
    isLoading,
    issue,
    playableSources: snapshot.playableSources,
    unavailableSources: snapshot.unavailableSources,
    refresh() {
      if (authState.status !== 'authorized' || !authState.accessToken) {
        return;
      }

      setRefreshCount((currentValue) => currentValue + 1);
    },
  };
};