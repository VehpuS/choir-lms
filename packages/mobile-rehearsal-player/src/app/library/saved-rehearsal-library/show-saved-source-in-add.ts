import type {
  DriveCurrentSourceLocationUnresolvedReason,
  DriveFolder,
} from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { resolveSavedSourceCurrentLocation } from './resolve-saved-source-current-location';

export type ShowSavedSourceInAddResult =
  | { status: 'opened' }
  | {
      status: 'unresolved';
      reason: DriveCurrentSourceLocationUnresolvedReason;
    };

/**
 * Resolves a saved source's current Drive parent folder and opens it in the
 * Add Drive browser, reconstructing the breadcrumb from the resolved path so
 * a moved file never opens its stale saved-time parent. Callers are
 * responsible for switching to Add themselves (typically before calling
 * this, so the destination screen can show its own loading state).
 */
export const showSavedSourceOriginalFolderInAdd = async (options: {
  accessToken: string;
  openFolder: (folder: DriveFolder) => void;
  resolveCurrentLocation?: Parameters<
    typeof resolveSavedSourceCurrentLocation
  >[0]['resolveCurrentLocation'];
  saveSource: (source: DriveLibrarySource) => Promise<boolean>;
  signal?: AbortSignal;
  source: DriveLibrarySource;
}): Promise<ShowSavedSourceInAddResult> => {
  const resolution = await resolveSavedSourceCurrentLocation({
    accessToken: options.accessToken,
    resolveCurrentLocation: options.resolveCurrentLocation,
    saveSource: options.saveSource,
    signal: options.signal,
    source: options.source,
  });

  if (resolution.status === 'unresolved') {
    return resolution;
  }

  const location = resolution.location;

  options.openFolder({
    id: location.parentFolderId,
    name: location.parentFolderName,
    path: location.path,
    rootKind: location.rootKind,
    shared: location.rootKind === 'shared',
  });

  return { status: 'opened' };
};
