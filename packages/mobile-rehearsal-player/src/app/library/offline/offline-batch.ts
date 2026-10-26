import type { DriveAudioSource } from '@org/audio-library-models';
import type { KeepOfflineResult } from './offline-keeping';

/** Files fetched at once; enough to be quick without flooding the connection. */
const BATCH_CONCURRENCY = 3;

export type OfflineBatchResult = {
  failed: number;
  firstError?: string;
  kept: number;
  /** Files larger than the whole cache size, played but not kept. */
  tooLarge: number;
};

/**
 * Keeps each file with a few running at once. One failing file never stops the
 * rest; the result counts what happened so the caller can report it once.
 */
export const keepManyOffline = async <Source>(
  sources: readonly Source[],
  keepOne: (source: Source) => Promise<KeepOfflineResult>,
  concurrency: number = BATCH_CONCURRENCY,
): Promise<OfflineBatchResult> => {
  const result: OfflineBatchResult = { failed: 0, kept: 0, tooLarge: 0 };
  let next = 0;

  const worker = async () => {
    while (next < sources.length) {
      const source = sources[next];

      next += 1;

      try {
        if ((await keepOne(source)) === 'kept') {
          result.kept += 1;
        } else {
          result.tooLarge += 1;
        }
      } catch (error) {
        result.failed += 1;
        result.firstError ??=
          error instanceof Error && error.message.trim().length > 0
            ? error.message.trim()
            : undefined;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, sources.length) }, worker),
  );

  return result;
};

/** Keeps and removes many files at once; set by the Library controller. */
export type OfflineBatchRunner = {
  keepSources: (
    sources: readonly DriveAudioSource[],
  ) => Promise<OfflineBatchResult>;
  removeSources: (sources: readonly DriveAudioSource[]) => Promise<void>;
};

let runner: OfflineBatchRunner | null = null;

// Bulk actions live deep in selection surfaces that have no Drive session, so
// the controller that does registers the runner here, like the item requests.
export const setOfflineBatchRunner = (next: OfflineBatchRunner | null) => {
  runner = next;
};

export const getOfflineBatchRunner = () => runner;

/** Remembers the file ids a batch covers once per file (loops share a file). */
export const uniqueSourcesByFile = <Source extends { driveFileId: string }>(
  sources: readonly Source[],
): Source[] => {
  const seen = new Set<string>();

  return sources.filter((source) => {
    if (seen.has(source.driveFileId)) {
      return false;
    }

    seen.add(source.driveFileId);

    return true;
  });
};
