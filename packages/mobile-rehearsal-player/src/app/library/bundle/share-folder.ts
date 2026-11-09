import {
  describeBundleFailure,
  type BundleCancelled,
  type BundleFailure,
  type BundleProgress,
  type BundleServiceDependencies,
} from './bundle-service-types';
import { buildAndWriteBundle } from './bundle-write';
import { countBundleContents } from './read-bundle';
import { buildLibraryBundle } from '@org/audio-library-runtime';

export type SharePreview = {
  folderName: string;
  counts: ReturnType<typeof countBundleContents>;
  /** References to outside items left out when the choice is off. */
  leftOutReferenceCount: number;
  /** Outside tracks and composites that turning the choice on would add. */
  outsideItemCount: number;
};

/** What a share would hold, with and without the outside items, writing nothing. */
export const previewShare = async (
  deps: BundleServiceDependencies,
  folderId: string,
): Promise<SharePreview> => {
  const input = await deps.library.load();
  const common = {
    input,
    scope: { kind: 'folder' as const, folderId },
    author: deps.author,
    createdAt: (deps.now?.() ?? new Date()).toISOString(),
  };
  const without = buildLibraryBundle(common);
  const withOutside = buildLibraryBundle({
    ...common,
    includeOutsideReferences: true,
  });

  return {
    folderName:
      without.bundle.scope.kind === 'folder' ? without.bundle.scope.name : '',
    counts: countBundleContents(without.bundle),
    leftOutReferenceCount: without.leftOutReferenceCount,
    outsideItemCount: withOutside.includedOutsideItemCount,
  };
};

export type ShareResult =
  | { status: 'ok'; fileId: string; fileName: string; openUrl: string }
  | BundleFailure
  | BundleCancelled;

/** Drive's page for a file, where the user shares it with their singers. */
export const getDriveFileUrl = (fileId: string) =>
  `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;

/** Writes a folder bundle to `Choir LMS/Shares`; never touches Drive permissions. */
export const shareFolder = async (
  deps: BundleServiceDependencies,
  options: {
    folderId: string;
    folderName: string;
    includeOutsideReferences: boolean;
    selectedRecordingIds?: ReadonlySet<string>;
    signal?: AbortSignal;
    onProgress?: BundleProgress;
  },
): Promise<ShareResult> => {
  options.onProgress?.('folders');

  const folders = await deps.drive.ensureFolders(options.signal);

  if (folders.status === 'aborted') {
    return { status: 'cancelled' };
  }

  if (folders.status === 'failed') {
    return describeBundleFailure(folders.reason);
  }

  const written = await buildAndWriteBundle(deps, {
    scope: { kind: 'folder', folderId: options.folderId },
    includeOutsideReferences: options.includeOutsideReferences,
    selectedRecordingIds: options.selectedRecordingIds ?? new Set(),
    folder: folders.folders.shares,
    kind: 'share',
    label: options.folderName,
    signal: options.signal,
    onProgress: options.onProgress,
  });

  return written.status === 'ok'
    ? {
        status: 'ok',
        fileId: written.fileId,
        fileName: written.fileName,
        openUrl: getDriveFileUrl(written.fileId),
      }
    : written;
};
