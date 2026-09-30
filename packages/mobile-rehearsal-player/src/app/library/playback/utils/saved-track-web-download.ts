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

// Downloads still running; `reset` / `stop` abort them so a superseded load
// neither finishes into the player nor keeps using a slow connection.
const inFlightDownloads = new Set<AbortController>();

/** Aborts every download still running (the player was reset or stopped). */
export const abortSavedTrackDownloads = () => {
  for (const controller of inFlightDownloads) {
    controller.abort();
  }

  inFlightDownloads.clear();
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

/**
 * Starts a download that `abortSavedTrackDownloads` can cancel, filling in
 * browser defaults for timers, clock, and the app-wide progress store.
 */
export const startSavedTrackDownload = async (
  request: { headers?: Record<string, string>; url: string },
  dependencies: Partial<SavedTrackDownloadDependencies> &
    Pick<SavedTrackDownloadDependencies, 'fetch'>,
) => {
  const controller = new AbortController();

  inFlightDownloads.add(controller);

  try {
    return await downloadSavedTrackBlob(
      { ...request, signal: controller.signal },
      resolveDownloadDependencies(dependencies),
    );
  } finally {
    inFlightDownloads.delete(controller);
  }
};
