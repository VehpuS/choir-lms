import type { DriveCurrentSourceLocationUnresolvedReason } from '@org/google-drive';

import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model';
import { resolveSavedSourceCurrentLocation } from './resolve-saved-source-current-location';

export type OpenSavedSourceOriginalFolderResult =
  | { status: 'opened' }
  | {
      status: 'unresolved';
      reason: DriveCurrentSourceLocationUnresolvedReason;
    }
  | { status: 'unsupported-link' }
  | { status: 'open-failed' };

export const buildDriveFolderUrl = (parentFolderId: string) => {
  return `https://drive.google.com/drive/folders/${parentFolderId}`;
};

/**
 * Resolves a saved source's current Drive parent folder and opens it (not
 * the source file itself) through an injected Linking-shaped adapter, so the
 * destination always reflects a file that may have moved since it was saved.
 */
export const openSavedSourceOriginalFolderInGoogleDrive = async (options: {
  accessToken: string;
  canOpenUrl: (url: string) => Promise<boolean>;
  openUrl: (url: string) => Promise<unknown>;
  resolveCurrentLocation?: Parameters<
    typeof resolveSavedSourceCurrentLocation
  >[0]['resolveCurrentLocation'];
  saveSource: (source: DriveLibrarySource) => Promise<boolean>;
  signal?: AbortSignal;
  source: DriveLibrarySource;
}): Promise<OpenSavedSourceOriginalFolderResult> => {
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

  const url = buildDriveFolderUrl(resolution.location.parentFolderId);
  const isSupported = await options.canOpenUrl(url);

  if (!isSupported) {
    return { status: 'unsupported-link' };
  }

  try {
    await options.openUrl(url);
    return { status: 'opened' };
  } catch {
    return { status: 'open-failed' };
  }
};
