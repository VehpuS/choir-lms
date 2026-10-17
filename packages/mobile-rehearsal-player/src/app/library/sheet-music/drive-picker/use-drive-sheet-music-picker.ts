import {
  browseDriveSheetMusic,
  searchDriveSheetMusic,
  type DriveBrowseLocation,
  type DriveSheetMusicListing,
} from '@org/google-drive';
import { useCallback, useEffect, useState } from 'react';

import {
  classifyDrivePickerFailure,
  createDrivePickerNavigation,
  currentDrivePickerLocation,
  goUpInDrivePicker,
  openDrivePickerFolder,
  resolveDrivePickerSearchScope,
  type DrivePickerFailure,
  type DrivePickerSearchScope,
  type DrivePickerNavigation,
} from './model';

/** The Drive calls the picker makes; the spec swaps in a fake. */
export type DriveSheetMusicClient = {
  browse: typeof browseDriveSheetMusic;
  search: typeof searchDriveSheetMusic;
};

export const driveSheetMusicClient: DriveSheetMusicClient = {
  browse: browseDriveSheetMusic,
  search: searchDriveSheetMusic,
};

export type DrivePickerState =
  | {
      /** True while more pages of this folder or search are still arriving. */
      isLoadingMore: boolean;
      listing: DriveSheetMusicListing;
      status: 'ready';
    }
  | { reason: DrivePickerFailure; status: 'failed' }
  | { status: 'loading' };

const LOADING: DrivePickerState = { status: 'loading' };

/**
 * Browses and searches Drive for sheet music while the picker is open. A
 * folder or search shows its first page at once and fills in as more arrive. A
 * search follows the folder being browsed unless the singer widens it to all
 * of Drive. A request is cancelled when the place, the search, the scope, or
 * the picker changes, and a late answer is ignored. With no Drive token nothing is requested and the
 * picker says Drive access is needed.
 */
export const useDriveSheetMusicPicker = (options: {
  accessToken: string | undefined;
  client?: DriveSheetMusicClient;
}) => {
  const { accessToken, client = driveSheetMusicClient } = options;
  const [navigation, setNavigation] = useState<DrivePickerNavigation>(
    createDrivePickerNavigation,
  );
  const [query, setQuery] = useState('');
  const [state, setState] = useState<DrivePickerState>(LOADING);
  const [attempt, setAttempt] = useState(0);
  const [isWidened, setIsWidened] = useState(false);
  const location = currentDrivePickerLocation(navigation);
  const searchScope = resolveDrivePickerSearchScope(navigation, isWidened);

  useEffect(() => {
    if (!accessToken) {
      setState({ reason: 'needs-drive-access', status: 'failed' });
      return undefined;
    }

    const controller = new AbortController();
    let isCurrent = true;
    const onProgress = (listing: DriveSheetMusicListing) => {
      if (isCurrent) {
        setState({ isLoadingMore: true, listing, status: 'ready' });
      }
    };
    const request = query
      ? client.search({
          accessToken,
          location: searchScope === 'folder' ? location : undefined,
          onProgress,
          query,
          signal: controller.signal,
        })
      : client.browse({
          accessToken,
          location,
          onProgress,
          signal: controller.signal,
        });

    setState(LOADING);
    request.then(
      (listing) => {
        if (isCurrent) {
          setState({ isLoadingMore: false, listing, status: 'ready' });
        }
      },
      (error: unknown) => {
        if (isCurrent) {
          setState({
            reason: classifyDrivePickerFailure(error),
            status: 'failed',
          });
        }
      },
    );

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [
    accessToken,
    attempt,
    client,
    location.id,
    location.rootKind,
    query,
    searchScope,
  ]);

  const openFolder = useCallback(
    (folder: Parameters<typeof openDrivePickerFolder>[1]) => {
      setQuery('');
      setIsWidened(false);
      setNavigation((current) => openDrivePickerFolder(current, folder));
    },
    [],
  );
  const goUp = useCallback(() => {
    setIsWidened(false);
    setNavigation((current) => goUpInDrivePicker(current));
  }, []);
  const switchRoot = useCallback((root: DriveBrowseLocation) => {
    setQuery('');
    setIsWidened(false);
    setNavigation(createDrivePickerNavigation(root));
  }, []);
  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return {
    goUp,
    navigation,
    openFolder,
    query,
    retry,
    search: setQuery,
    searchScope,
    setSearchScope: (scope: DrivePickerSearchScope) => {
      setIsWidened(scope === 'everywhere');
    },
    state,
    switchRoot,
  };
};
