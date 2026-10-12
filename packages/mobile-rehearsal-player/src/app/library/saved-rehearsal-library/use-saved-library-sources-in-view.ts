import type { DriveAuthorizationState } from '@org/google-drive';
import { useMemo } from 'react';

import type { useDriveLibrary } from '../drive/hooks/use-drive-library';
import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { resolveSavedRehearsalLibrarySources } from './view-model';

// The saved tracks, each resolved against the Drive rows now on screen so a
// saved track keeps its live availability while the session is valid.
export const useSavedLibrarySourcesInView = (options: {
  authState: DriveAuthorizationState;
  driveLibrary: ReturnType<typeof useDriveLibrary>;
  savedSources: DriveLibrarySource[];
}) => {
  const { authState, driveLibrary, savedSources } = options;
  const { browseSnapshot, searchSnapshot } = driveLibrary;
  const visibleSources = useMemo(() => {
    return [
      ...browseSnapshot.playableSources,
      ...browseSnapshot.unavailableSources,
      ...searchSnapshot.playableSources,
      ...searchSnapshot.unavailableSources,
    ];
  }, [
    browseSnapshot.playableSources,
    browseSnapshot.unavailableSources,
    searchSnapshot.playableSources,
    searchSnapshot.unavailableSources,
  ]);

  return useMemo(() => {
    return resolveSavedRehearsalLibrarySources({
      authState,
      savedSources,
      visibleSources,
    });
  }, [authState, savedSources, visibleSources]);
};
