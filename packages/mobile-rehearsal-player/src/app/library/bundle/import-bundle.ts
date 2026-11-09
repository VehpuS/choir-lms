import type { LibraryBundle } from '@org/audio-library-models';
import {
  executeLibraryBundleImport,
  planLibraryBundleImport,
  REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  type LibraryBundleImportPlan,
  type LibraryBundleImportProgress,
  type LibraryBundleImportResult,
} from '@org/audio-library-runtime';

import type {
  BundleCancelled,
  BundleProgress,
  BundleServiceDependencies,
} from './bundle-service-types';
import {
  restoreBundleRecordings,
  type RecordingRestoreOutcome,
} from './restore-bundle-recordings';

export type ImportPreview = {
  bundle: LibraryBundle;
  bundleName: string;
  droppedTotal: number;
  /** Stable for this import and its retries, so a retry does not duplicate. */
  importId: string;
  /** Fixed at preview time: a retry recognises its own earlier writes by it. */
  importedAt: string;
  /** Drive files the user could not open at preview time. */
  needsAccessDriveFileIds: ReadonlySet<string>;
  /** True when the probe could not run (offline, sign-in expired). */
  accessUnchecked: boolean;
  plan: LibraryBundleImportPlan;
};

const DEFAULT_DESTINATION = REHEARSAL_LIBRARY_ROOT_FOLDER_ID;

const planFor = async (
  deps: BundleServiceDependencies,
  preview: Pick<
    ImportPreview,
    | 'bundle'
    | 'bundleName'
    | 'importId'
    | 'importedAt'
    | 'needsAccessDriveFileIds'
  >,
  destinationFolderId: string,
) => {
  const input = await deps.library.load();

  return planLibraryBundleImport({
    bundle: preview.bundle,
    bundleName: preview.bundleName,
    destinationFolderId,
    importId: preview.importId,
    importedAt: preview.importedAt,
    ownerId: deps.library.ownerId,
    state: {
      entityCollections: {
        sources: [...input.sources],
        loops: [...input.loops],
        playlists: [...input.playlists],
        composites: [...input.composites],
      },
      tree: input.tree,
    },
    needsAccessDriveFileIds: preview.needsAccessDriveFileIds,
  });
};

/**
 * Probes which of the bundle's files the user can open (only those the
 * library does not already hold) and plans the import, writing nothing. A
 * probe that cannot decide is never treated as `needs-access`.
 */
export const buildImportPreview = async (
  deps: BundleServiceDependencies,
  options: {
    bundle: LibraryBundle;
    bundleName: string;
    droppedTotal: number;
    signal?: AbortSignal;
  },
): Promise<ImportPreview | BundleCancelled> => {
  const now = (deps.now?.() ?? new Date()).toISOString();
  const input = await deps.library.load();
  const known = new Set(input.sources.map((source) => source.driveFileId));
  const toProbe = [
    ...new Set(
      options.bundle.sources
        .map((source) => source.driveFileId)
        .filter((id) => !known.has(id)),
    ),
  ];
  const probe = await deps.drive.probe(toProbe, options.signal);

  if (probe.aborted) {
    return { status: 'cancelled' };
  }

  const needsAccessDriveFileIds = new Set(
    [...probe.access].flatMap(([id, access]) =>
      access === 'needs-access' ? [id] : [],
    ),
  );
  const importId = deps.createId?.() ?? now;
  const base = {
    bundle: options.bundle,
    bundleName: options.bundleName,
    importId,
    importedAt: now,
    needsAccessDriveFileIds,
  };

  return {
    ...base,
    droppedTotal: options.droppedTotal,
    accessUnchecked: [...probe.access.values()].some(
      (access) => access === 'unknown',
    ),
    plan: await planFor(deps, base, DEFAULT_DESTINATION),
  };
};

export type ImportRunResult =
  | {
      status: 'done';
      result: LibraryBundleImportResult;
      plan: LibraryBundleImportPlan;
      recordings: RecordingRestoreOutcome | null;
    }
  | BundleCancelled;

/** Applies the import at the chosen destination, then reloads what the screens hold. */
export const runImport = async (
  deps: BundleServiceDependencies,
  options: {
    preview: ImportPreview;
    destinationFolderId: string;
    /** Also bring the bundle's recordings back from Drive (web only). */
    restoreRecordings?: boolean;
    signal?: AbortSignal;
    onProgress?: (progress: LibraryBundleImportProgress) => void;
    onPhase?: BundleProgress;
  },
): Promise<ImportRunResult> => {
  const plan = await planFor(
    deps,
    options.preview,
    options.destinationFolderId,
  );
  const result = await executeLibraryBundleImport({
    ownerId: deps.library.ownerId,
    plan,
    repository: deps.library.repository,
    signal: options.signal,
    onProgress: options.onProgress,
  });

  await deps.library.onLibraryChanged();

  if (
    result.status === 'cancelled' &&
    result.outcomes.every(({ status }) => status !== 'done')
  ) {
    return { status: 'cancelled' };
  }

  // Only a finished import has the tracks and loops the recordings attach to.
  const recordings =
    options.restoreRecordings && result.status === 'completed'
      ? await restoreBundleRecordings(deps, {
          bundle: options.preview.bundle,
          idMaps: plan.idMaps,
          key: options.preview.importId,
          signal: options.signal,
          onProgress: options.onPhase,
        })
      : null;

  return { status: 'done', result, plan, recordings };
};
