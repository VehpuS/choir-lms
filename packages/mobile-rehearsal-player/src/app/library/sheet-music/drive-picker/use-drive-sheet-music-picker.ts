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
  type DrivePickerFailure,
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
  | { listing: DriveSheetMusicListing; status: 'ready' }
  | { reason: DrivePickerFailure; status: 'failed' }
  | { status: 'loading' };

const LOADING: DrivePickerState = { status: 'loading' };

/**
 * Browses and searches Drive for sheet music while the picker is open. A
 * request is cancelled when the place, the search, or the picker changes, and
 * a late answer is ignored. With no Drive token nothing is requested and the
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
  const location = currentDrivePickerLocation(navigation);

  useEffect(() => {
    if (!accessToken) {
      setState({ reason: 'needs-drive-access', status: 'failed' });
      return undefined;
    }

    const controller = new AbortController();
    let isCurrent = true;
    const request = query
      ? client.search({ accessToken, query, signal: controller.signal })
      : client.browse({ accessToken, location, signal: controller.signal });

    setState(LOADING);
    request.then(
      (listing) => {
        if (isCurrent) {
          setState({ listing, status: 'ready' });
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
  }, [accessToken, attempt, client, location.id, location.rootKind, query]);

  const openFolder = useCallback(
    (folder: Parameters<typeof openDrivePickerFolder>[1]) => {
      setQuery('');
      setNavigation((current) => openDrivePickerFolder(current, folder));
    },
    [],
  );
  const goUp = useCallback(() => {
    setNavigation((current) => goUpInDrivePicker(current));
  }, []);
  const switchRoot = useCallback((root: DriveBrowseLocation) => {
    setQuery('');
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
    state,
    switchRoot,
  };
};
