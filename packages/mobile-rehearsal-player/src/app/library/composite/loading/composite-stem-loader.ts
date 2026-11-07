import type { PcmWindowReader } from '@org/audio-mixing';

import {
  createAbortError,
  isSavedTrackDownloadAbortError,
} from '../../playback/utils/saved-track-blob-download';

/**
 * Loads every stem of a composite before it plays (composite-tracks design
 * Decision 10): playback waits for all stems so the mix never changes while
 * the user sings. A stem that cannot be loaded is flagged and skipped and the
 * rest play. Loading is cancelled cleanly when something newer supersedes it,
 * through the same abort path track downloads use.
 *
 * How one stem becomes a reader (the normal track path: playback cache, offline
 * store, then Drive; then the prepared store) is the injected `loadStem`; this
 * module only orchestrates, reports progress and handles failure and abort.
 */

export const DEFAULT_STEM_LOAD_CONCURRENCY = 2;
const NO_PROGRESS = 0;
const FULL_PROGRESS = 1;

export type StemLoadStatus = 'waiting' | 'loading' | 'ready' | 'failed';

export type StemLoadProgress = {
  stemId: string;
  status: StemLoadStatus;
  /** 0 to 1 while loading; 1 once ready. */
  fraction: number;
};

export type LoadStemRequest = {
  stemId: string;
  signal: AbortSignal;
  /** Reports 0 to 1 for this stem. */
  onProgress: (fraction: number) => void;
};

export type LoadStem = (request: LoadStemRequest) => Promise<PcmWindowReader>;

export type StemLoadFailure = { stemId: string; error: unknown };

export type CompositeStemLoadResult = {
  readers: ReadonlyMap<string, PcmWindowReader>;
  /** Stems that could not be loaded; the composite plays without them. */
  failed: StemLoadFailure[];
};

export type LoadCompositeStemsOptions = {
  stemIds: readonly string[];
  loadStem: LoadStem;
  /** Called with a fresh snapshot, in stem order, whenever any stem changes. */
  onProgress?: (snapshot: readonly StemLoadProgress[]) => void;
  /** Aborting rejects with the shared abort error and cancels stems in flight. */
  signal?: AbortSignal;
  concurrency?: number;
};

/** The overall fraction for a progress bar: the mean over all stems. */
export const getOverallLoadFraction = (
  snapshot: readonly StemLoadProgress[],
): number => {
  if (snapshot.length === 0) {
    return FULL_PROGRESS;
  }

  const total = snapshot.reduce((sum, entry) => sum + entry.fraction, 0);

  return total / snapshot.length;
};

const clampFraction = (value: number): number => {
  return Number.isFinite(value)
    ? Math.min(FULL_PROGRESS, Math.max(NO_PROGRESS, value))
    : NO_PROGRESS;
};

export const loadCompositeStems = async (
  options: LoadCompositeStemsOptions,
): Promise<CompositeStemLoadResult> => {
  const { stemIds, loadStem } = options;
  const concurrency = Math.max(
    1,
    options.concurrency ?? DEFAULT_STEM_LOAD_CONCURRENCY,
  );
  // One controller of our own: it follows the caller's signal and also stops
  // the stems still in flight as soon as one of them reports an abort.
  const controller = new AbortController();
  const readers = new Map<string, PcmWindowReader>();
  const failed: StemLoadFailure[] = [];
  const progress = new Map<string, StemLoadProgress>(
    stemIds.map((stemId) => [
      stemId,
      { stemId, status: 'waiting', fraction: NO_PROGRESS },
    ]),
  );
  let superseded = options.signal?.aborted ?? false;

  const abort = () => {
    superseded = true;
    controller.abort();
  };

  options.signal?.addEventListener('abort', abort);

  if (superseded) {
    controller.abort();
  }

  const publish = (
    stemId: string,
    change: Pick<StemLoadProgress, 'status' | 'fraction'>,
  ) => {
    // A superseded load reports nothing more: its owner has moved on.
    if (superseded) {
      return;
    }

    progress.set(stemId, { stemId, ...change });
    options.onProgress?.(
      stemIds.map((id) => progress.get(id) as StemLoadProgress),
    );
  };

  const loadOne = async (stemId: string) => {
    if (superseded) {
      return;
    }

    publish(stemId, { status: 'loading', fraction: NO_PROGRESS });

    try {
      const reader = await loadStem({
        stemId,
        signal: controller.signal,
        onProgress: (fraction) =>
          publish(stemId, {
            status: 'loading',
            fraction: clampFraction(fraction),
          }),
      });

      if (superseded) {
        return;
      }

      readers.set(stemId, reader);
      publish(stemId, { status: 'ready', fraction: FULL_PROGRESS });
    } catch (error) {
      if (superseded || isSavedTrackDownloadAbortError(error)) {
        abort();

        return;
      }

      failed.push({ stemId, error });
      publish(stemId, { status: 'failed', fraction: NO_PROGRESS });
    }
  };

  const queue = [...stemIds];
  const worker = async () => {
    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
      await loadOne(next);
    }
  };

  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, stemIds.length) }, worker),
    );
  } finally {
    options.signal?.removeEventListener('abort', abort);
  }

  if (superseded) {
    throw createAbortError();
  }

  return { readers, failed };
};
