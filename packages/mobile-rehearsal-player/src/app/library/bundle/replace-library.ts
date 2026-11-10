import { omit } from 'es-toolkit';
import {
  createRehearsalLibraryRootFolderNode,
  planLibraryBundleImport,
  REHEARSAL_LIBRARY_FILE_TREE_VERSION,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  type LibraryBundleImportPlan,
  type ReplacementLibraryState,
} from '@org/audio-library-runtime';
import type { LibraryBundle } from '@org/audio-library-models';

import {
  describeBundleFailure,
  type BundleCancelled,
  type BundleFailure,
  type BundleProgress,
  type BundleServiceDependencies,
} from './bundle-service-types';
import { buildAndWriteBundle } from './bundle-write';
import {
  restoreBundleRecordings,
  type RecordingRestoreOutcome,
} from './restore-bundle-recordings';

const withoutProvenance = <Item extends { importedFrom?: unknown }>(
  item: Item,
): Item => omit(item, ['importedFrom']) as Item;

/**
 * The whole library a bundle describes, as one state to swap in. It reuses the
 * import planner against an empty library, then lifts the import root away so
 * the bundle's top level sits at the library root. A user's own backup comes
 * back unmarked; someone else's keeps its `Imported from` marks.
 */
export const buildReplacement = (options: {
  bundle: LibraryBundle;
  bundleName: string;
  isOwn: boolean;
  ownerId: string;
  importedAt: string;
  /** Unique per replace, so restored recording ids never collide with an earlier replace's. */
  importId?: string;
  needsAccessDriveFileIds?: ReadonlySet<string>;
}): {
  state: ReplacementLibraryState;
  idMaps: LibraryBundleImportPlan['idMaps'];
} => {
  const rootId = REHEARSAL_LIBRARY_ROOT_FOLDER_ID;
  const plan = planLibraryBundleImport({
    bundle: options.bundle,
    bundleName: options.bundleName,
    destinationFolderId: rootId,
    importId: options.importId ?? 'replace',
    importedAt: options.importedAt,
    ownerId: options.ownerId,
    state: {
      entityCollections: {
        sources: [],
        loops: [],
        playlists: [],
        composites: [],
      },
      tree: {
        version: REHEARSAL_LIBRARY_FILE_TREE_VERSION,
        rootFolderId: rootId,
        folders: [],
        fileLinks: [],
      },
    },
    needsAccessDriveFileIds: options.needsAccessDriveFileIds,
  });
  const clean = <Item extends { importedFrom?: unknown }>(item: Item) =>
    options.isOwn ? withoutProvenance(item) : item;
  const lift = (parentFolderId: string) =>
    parentFolderId === plan.rootFolder.id ? rootId : parentFolderId;

  const state: ReplacementLibraryState = {
    sources: plan.newSources.map(clean),
    loops: plan.loops.map(clean),
    playlists: plan.playlists.map(clean),
    composites: plan.composites.map(clean),
    tree: {
      version: REHEARSAL_LIBRARY_FILE_TREE_VERSION,
      rootFolderId: rootId,
      folders: [
        createRehearsalLibraryRootFolderNode({ createdAt: options.importedAt }),
        ...plan.folders.map((folder) =>
          clean({
            ...folder,
            parentFolderId: lift(folder.parentFolderId ?? rootId),
          }),
        ),
      ],
      fileLinks: plan.fileLinks.map((link) => ({
        ...link,
        parentFolderId: lift(link.parentFolderId),
      })),
    },
  };

  return { state, idMaps: plan.idMaps };
};

/** The state alone, for callers that do not restore recordings. */
export const buildReplacementState = (
  options: Parameters<typeof buildReplacement>[0],
): ReplacementLibraryState => buildReplacement(options).state;

export type ReplaceResult =
  | {
      status: 'ok';
      safetyBackupName: string;
      removedSourceIds: string[];
      recordings: RecordingRestoreOutcome | null;
    }
  /** The safety backup failed or was cancelled; the library is untouched. */
  | (BundleFailure & { libraryChanged: false })
  | BundleCancelled;

/**
 * Replace (library-backup-restore spec): back up the current library first,
 * with every recording, stop if that fails, then swap the new state in with
 * one commit. The safety backup stays in `Backups` as the undo.
 */
export const replaceLibraryFromBundle = async (
  deps: BundleServiceDependencies,
  options: {
    bundle: LibraryBundle;
    bundleName: string;
    isOwn: boolean;
    /** Also bring the bundle's recordings back from Drive (web only). */
    restoreRecordings?: boolean;
    signal?: AbortSignal;
    onProgress?: BundleProgress;
  },
): Promise<ReplaceResult> => {
  options.onProgress?.('safety-backup');

  const folders = await deps.drive.ensureFolders(options.signal);

  if (folders.status === 'aborted') {
    return { status: 'cancelled' };
  }

  if (folders.status === 'failed') {
    return { ...describeBundleFailure(folders.reason), libraryChanged: false };
  }

  const recordings = await deps.library.recordings();
  const safety = await buildAndWriteBundle(deps, {
    scope: { kind: 'library' },
    selectedRecordingIds: new Set(recordings.map(({ id }) => id)),
    folder: folders.folders.backups,
    kind: 'pre-restore',
    signal: options.signal,
    onProgress: options.onProgress,
  });

  if (safety.status === 'cancelled') {
    return safety;
  }

  if (safety.status === 'failed') {
    return { ...safety, libraryChanged: false };
  }

  options.onProgress?.('replacing');

  const now = (deps.now?.() ?? new Date()).toISOString();
  const replacement = buildReplacement({
    bundle: options.bundle,
    bundleName: options.bundleName,
    isOwn: options.isOwn,
    ownerId: deps.library.ownerId,
    importedAt: now,
    importId: `replace-${now}`,
  });
  const { removedSourceIds } = await deps.library.repository.replaceLibrary(
    deps.library.ownerId,
    replacement.state,
  );

  await deps.library.onLibraryChanged();

  // After the commit: a recording that fails here never undoes the replace.
  const restoredRecordings = options.restoreRecordings
    ? await restoreBundleRecordings(deps, {
        bundle: options.bundle,
        idMaps: replacement.idMaps,
        signal: options.signal,
        onProgress: options.onProgress,
      })
    : null;
  // Housekeeping after the commit; the library is already replaced.
  await deps.drive.prune({
    backupsFolderId: folders.folders.backups.id,
    protectedIds: new Set([safety.fileId]),
    signal: options.signal,
  });

  return {
    status: 'ok',
    safetyBackupName: safety.fileName,
    removedSourceIds,
    recordings: restoredRecordings,
  };
};
