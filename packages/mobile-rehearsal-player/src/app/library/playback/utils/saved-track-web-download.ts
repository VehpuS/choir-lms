import {
  persistentAudioCache,
  type PersistentAudioCache,
} from '../audio-cache';
import {
  savedTrackAudioCache,
  type SavedTrackAudioCache,
} from './saved-track-audio-cache';
import { emitSavedTrackDownloaded } from './saved-track-download-events';
import {
  IDLE_SAVED_TRACK_DOWNLOAD_PROGRESS,
  savedTrackDownloadProgressStore,
  type SavedTrackDownloadProgressStore,
} from './saved-track-download-progress';

/** After this long a download counts as slow, for the UI and the dev warning. */
export const SLOW_SAVED_TRACK_DOWNLOAD_MS = 5000;

const CONTENT_LENGTH_HEADER = 'content-length';
const CONTENT_TYPE_HEADER = 'content-type';
const ABORT_ERROR_NAME = 'AbortError';
const DRIVE_FILE_ID_PATTERN = /\/files\/([^/?]+)/;
const MS_PER_SECOND = 1000;

let lastDownloadId = 0;
let unkeyedDownloadCount = 0;

type SavedTrackDownloadReader = {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
};

export type SavedTrackDownloadResponse = {
  blob(): Promise<Blob>;
  body?: { getReader(): SavedTrackDownloadReader } | null;
  headers?: { get(name: string): string | null };
  ok: boolean;
  status: number;
};

export type SavedTrackDownloadDependencies = {
  clearTimer: (handle: unknown) => void;
  fetch: (
    input: string,
    init?: {
      headers?: Record<string, string>;
      signal?: AbortSignal;
    },
  ) => Promise<SavedTrackDownloadResponse>;
  now: () => number;
  setTimer: (callback: () => void, delayMs: number) => unknown;
  store: SavedTrackDownloadProgressStore;
  /** Development-only diagnostics; omitted in production builds. */
  warn?: (message: string) => void;
};

/** A download stopped because the player was reset for something newer. */
export const isSavedTrackDownloadAbortError = (error: unknown) => {
  return error instanceof Error && error.name === ABORT_ERROR_NAME;
};

const createAbortError = () => {
  const error = new Error('Saved track download was superseded.');

  error.name = ABORT_ERROR_NAME;

  return error;
};

const parseContentLength = (response: SavedTrackDownloadResponse) => {
  const value = Number(response.headers?.get(CONTENT_LENGTH_HEADER));

  return Number.isFinite(value) && value > 0 ? value : null;
};

const describeDownload = (url: string) => {
  return DRIVE_FILE_ID_PATTERN.exec(url)?.[1] ?? url;
};

const readResponseBlob = async (
  response: SavedTrackDownloadResponse,
  signal: AbortSignal,
  onChunk: (receivedBytes: number) => void,
) => {
  const reader = response.body?.getReader();

  // Without a readable body (older runtimes, test fakes) the download still
  // works; it just reports no intermediate progress.
  if (!reader) {
    return response.blob();
  }

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  for (;;) {
    const { done, value } = await reader.read();

    // Browsers reject the pending read on abort; checking here as well stops
    // a runtime that keeps delivering chunks.
    if (signal.aborted) {
      throw createAbortError();
    }

    if (done) {
      break;
    }

    if (value) {
      chunks.push(value);
      receivedBytes += value.byteLength;
      onChunk(receivedBytes);
    }
  }

  // React Native's Blob typings accept only strings and blobs; this path runs
  // on web only, where byte chunks are valid blob parts.
  return new Blob(chunks as unknown as Blob[], {
    lastModified: Date.now(),
    type: response.headers?.get(CONTENT_TYPE_HEADER) ?? '',
  });
};

/**
 * Downloads a Drive media URL into a blob, publishing progress and a slow
 * flag while it runs, and rejecting with an abort error when `signal` fires.
 */
export const downloadSavedTrackBlob = async (
  request: {
    headers?: Record<string, string>;
    signal: AbortSignal;
    url: string;
  },
  dependencies: SavedTrackDownloadDependencies,
) => {
  lastDownloadId += 1;
  const downloadId = lastDownloadId;
  const startedAtMs = dependencies.now();
  let receivedBytes = 0;
  let totalBytes: number | null = null;
  let isSlow = false;

  const publish = () => {
    dependencies.store.publish({
      downloadId,
      isSlow,
      receivedBytes,
      startedAtMs,
      status: 'downloading',
      totalBytes,
    });
  };

  const slowTimer = dependencies.setTimer(() => {
    isSlow = true;
    publish();
    dependencies.warn?.(
      `[playback] Slow web media download: Drive file ${describeDownload(request.url)} has taken over ${SLOW_SAVED_TRACK_DOWNLOAD_MS / MS_PER_SECOND} s (${receivedBytes} of ${totalBytes ?? 'unknown'} bytes). Web playback downloads the whole file before it can play; see "Slow connections" in docs/mobile-cross-platform-audio-playback.md.`,
    );
  }, SLOW_SAVED_TRACK_DOWNLOAD_MS);

  publish();

  try {
    if (request.signal.aborted) {
      throw createAbortError();
    }

    const response = await dependencies.fetch(request.url, {
      headers: request.headers,
      signal: request.signal,
    });

    if (!response.ok) {
      throw new Error(
        `Web playback media request failed with ${response.status}.`,
      );
    }

    totalBytes = parseContentLength(response);
    publish();

    const blob = await readResponseBlob(
      response,
      request.signal,
      (nextReceivedBytes) => {
        receivedBytes = nextReceivedBytes;
        publish();
      },
    );

    if (request.signal.aborted) {
      throw createAbortError();
    }

    return blob;
  } catch (error) {
    throw request.signal.aborted ? createAbortError() : error;
  } finally {
    dependencies.clearTimer(slowTimer);

    // A superseded download finishes after its replacement has started, so it
    // must not clear the replacement's progress.
    const currentProgress = dependencies.store.getSnapshot();

    if (
      currentProgress.status === 'downloading' &&
      currentProgress.downloadId === downloadId
    ) {
      dependencies.store.publish(IDLE_SAVED_TRACK_DOWNLOAD_PROGRESS);
    }
  }
};

// Downloads still running, one per file and version. Each caller holds a
// waiter; a download is cancelled only when its last waiter leaves, so a
// superseded request never cancels bytes another caller still needs.
type SharedDownload = {
  controller: AbortController;
  promise: Promise<Blob>;
  waiters: Set<Waiter>;
};

type Waiter = {
  cancelOnReset: boolean;
  release: () => void;
};

const sharedDownloads = new Map<string, SharedDownload>();

/**
 * Releases every waiter that asked to be cancelled on reset (the player was
 * reset or stopped). Downloads another caller still waits on keep running.
 */
export const abortSavedTrackDownloads = () => {
  for (const download of sharedDownloads.values()) {
    for (const waiter of [...download.waiters]) {
      if (waiter.cancelOnReset) {
        waiter.release();
      }
    }
  }
};

const resolveDownloadDependencies = (
  dependencies: Partial<SavedTrackDownloadDependencies> &
    Pick<SavedTrackDownloadDependencies, 'fetch'>,
): SavedTrackDownloadDependencies => {
  return {
    clearTimer:
      dependencies.clearTimer ??
      ((handle) => {
        clearTimeout(handle as ReturnType<typeof setTimeout>);
      }),
    fetch: dependencies.fetch,
    now: dependencies.now ?? (() => Date.now()),
    // Wrapped: browsers throw "Illegal invocation" when `setTimeout` is
    // called as a method of another object.
    setTimer:
      dependencies.setTimer ??
      ((callback, delayMs) => {
        return setTimeout(callback, delayMs);
      }),
    store: dependencies.store ?? savedTrackDownloadProgressStore,
    warn: dependencies.warn,
  };
};

export type StartSavedTrackDownloadOptions = {
  /** Test seam; defaults to the app-wide cache. */
  cache?: SavedTrackAudioCache;
  /** Test seam; defaults to the persisted cache (a no-op on native). */
  persistence?: Pick<PersistentAudioCache, 'read' | 'write'>;
  /** False for background callers (waveform analysis) that survive a reset. */
  cancelOnReset?: boolean;
  /** Drive content version; without one the bytes are never reused. */
  version?: string;
};

const parseDriveFileId = (url: string) => {
  return DRIVE_FILE_ID_PATTERN.exec(url)?.[1] ?? null;
};

/**
 * Downloads a Drive media URL, reusing cached bytes for the same file and
 * version and sharing one in-flight download between concurrent callers.
 * `abortSavedTrackDownloads` cancels it, once no waiter remains. Fills in
 * browser defaults for timers, clock, and the app-wide progress store.
 */
export const startSavedTrackDownload = async (
  request: { headers?: Record<string, string>; url: string },
  dependencies: Partial<SavedTrackDownloadDependencies> &
    Pick<SavedTrackDownloadDependencies, 'fetch'>,
  options: StartSavedTrackDownloadOptions = {},
): Promise<Blob> => {
  const {
    cache = savedTrackAudioCache,
    cancelOnReset = true,
    persistence = persistentAudioCache,
  } = options;
  const driveFileId = parseDriveFileId(request.url);
  const version = options.version;
  const cacheable = driveFileId !== null && version !== undefined;
  const cachedBlob = cacheable ? cache.get(driveFileId, version) : null;

  // Waveform analysis reuses these bytes rather than fetching the file again.
  if (cachedBlob) {
    emitSavedTrackDownloaded({ blob: cachedBlob, driveFileId });

    return cachedBlob;
  }

  const shareKey = cacheable ? `${driveFileId}:${version}` : null;
  let download = shareKey ? sharedDownloads.get(shareKey) : undefined;

  if (!download) {
    const controller = new AbortController();
    const waiters = new Set<Waiter>();
    // A file persisted by an earlier session is read inside the shared
    // promise, so callers that arrive meanwhile share the read too.
    const loadSavedTrackBlob = async () => {
      const persistedBlob = cacheable
        ? await persistence.read(driveFileId, version)
        : null;

      if (persistedBlob) {
        return persistedBlob;
      }

      const blob = await downloadSavedTrackBlob(
        { ...request, signal: controller.signal },
        resolveDownloadDependencies(dependencies),
      );

      if (cacheable) {
        // Not awaited: the player must not wait on storage.
        void persistence.write(driveFileId, version, blob);
      }

      return blob;
    };
    const started: SharedDownload = {
      controller,
      promise: loadSavedTrackBlob().then((blob) => {
        if (cacheable) {
          cache.set(driveFileId, version, blob);
        }

        emitSavedTrackDownloaded({ blob, driveFileId });

        return blob;
      }),
      waiters,
    };
    // Downloads without a version are not shared, but reset must still reach
    // them, so they live under a unique key.
    const mapKey = shareKey ?? `unkeyed:${(unkeyedDownloadCount += 1)}`;
    const settle = () => {
      if (sharedDownloads.get(mapKey) === started) {
        sharedDownloads.delete(mapKey);
      }
    };

    started.promise.then(settle, settle);
    sharedDownloads.set(mapKey, started);

    download = started;
  }

  const sharedDownload = download;

  return new Promise<Blob>((resolve, reject) => {
    const waiter: Waiter = {
      cancelOnReset,
      release: () => {
        sharedDownload.waiters.delete(waiter);
        reject(createAbortError());

        if (sharedDownload.waiters.size === 0) {
          sharedDownload.controller.abort();
        }
      },
    };

    sharedDownload.waiters.add(waiter);
    sharedDownload.promise.then(
      (blob) => {
        sharedDownload.waiters.delete(waiter);
        resolve(blob);
      },
      (error: unknown) => {
        sharedDownload.waiters.delete(waiter);
        reject(error);
      },
    );
  });
};
