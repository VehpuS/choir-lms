import type { LibraryBundleImportPlan } from './library-bundle-import-plan.ts';
import type {
  ImportedEntities,
  ImportedTreeNodes,
} from './library-bundle-import-storage.ts';

/**
 * Applies an import plan in ordered phases with outcomes, progress and cancel,
 * following the Drive import executor's shape. Entities are written before the
 * tree that links them, and every phase is self-consistent, so a failure or a
 * cancel leaves a valid library; planning again with the same import id resumes
 * without duplicating anything (library-share-import spec).
 */

export const IMPORT_PHASES = [
  'tracks',
  'composites',
  'loops',
  'playlists',
  'tree',
] as const;

export type ImportPhase = (typeof IMPORT_PHASES)[number];

export type ImportPhaseOutcome = {
  phase: ImportPhase;
  status: 'done' | 'failed' | 'cancelled' | 'skipped';
  /** Entities, or folders and links for `tree`, written by the phase. */
  count: number;
  error?: string;
};

export type LibraryBundleImportProgress = {
  phase: ImportPhase;
  completedPhases: number;
  totalPhases: number;
};

export type LibraryBundleImportResult = {
  status: 'completed' | 'cancelled' | 'failed';
  outcomes: ImportPhaseOutcome[];
};

export type LibraryBundleImportRepository = {
  importLibraryEntities(
    ownerId: string,
    entities: ImportedEntities,
  ): Promise<void>;
  importLibraryTreeNodes(
    ownerId: string,
    nodes: ImportedTreeNodes,
  ): Promise<unknown>;
};

export type ExecuteLibraryBundleImportOptions = {
  ownerId: string;
  plan: LibraryBundleImportPlan;
  repository: LibraryBundleImportRepository;
  signal?: AbortSignal;
  onProgress?: (progress: LibraryBundleImportProgress) => void;
};

const describeError = (error: unknown) =>
  error instanceof Error ? error.message : 'The import could not be saved.';

export const executeLibraryBundleImport = async (
  options: ExecuteLibraryBundleImportOptions,
): Promise<LibraryBundleImportResult> => {
  const { ownerId, plan, repository, signal } = options;
  const tracks = [...plan.newSources, ...plan.updatedSources];
  const writers: Record<
    ImportPhase,
    { count: number; run: () => Promise<unknown> }
  > = {
    tracks: {
      count: tracks.length,
      run: () => repository.importLibraryEntities(ownerId, { sources: tracks }),
    },
    composites: {
      count: plan.composites.length,
      run: () =>
        repository.importLibraryEntities(ownerId, {
          composites: plan.composites,
        }),
    },
    loops: {
      count: plan.loops.length,
      run: () =>
        repository.importLibraryEntities(ownerId, { loops: plan.loops }),
    },
    playlists: {
      count: plan.playlists.length,
      run: () =>
        repository.importLibraryEntities(ownerId, {
          playlists: plan.playlists,
        }),
    },
    tree: {
      count: plan.folders.length + plan.fileLinks.length,
      run: () =>
        repository.importLibraryTreeNodes(ownerId, {
          folders: plan.rootFolderExists
            ? plan.folders
            : [plan.rootFolder, ...plan.folders],
          fileLinks: plan.fileLinks,
          ownedEntities: plan.ownedEntities,
        }),
    },
  };
  const outcomes: ImportPhaseOutcome[] = [];
  let stopped: 'cancelled' | 'failed' | null = null;

  for (const [index, phase] of IMPORT_PHASES.entries()) {
    const { count, run } = writers[phase];

    if (stopped !== null) {
      outcomes.push({
        phase,
        status: stopped === 'cancelled' ? 'cancelled' : 'skipped',
        count: 0,
      });
      continue;
    }

    if (signal?.aborted) {
      stopped = 'cancelled';
      outcomes.push({ phase, status: 'cancelled', count: 0 });
      continue;
    }

    options.onProgress?.({
      phase,
      completedPhases: index,
      totalPhases: IMPORT_PHASES.length,
    });

    // A phase with nothing to write is done without touching storage, except
    // the tree, which always carries the import root.
    try {
      if (count > 0 || phase === 'tree') {
        await run();
      }

      outcomes.push({ phase, status: 'done', count });
    } catch (error) {
      stopped = 'failed';
      outcomes.push({
        phase,
        status: 'failed',
        count: 0,
        error: describeError(error),
      });
    }
  }

  return { status: stopped ?? 'completed', outcomes };
};
