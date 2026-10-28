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
  clearStoreIfShowing,
  createFanOutProgressStore,
} from './saved-track-download-fan-out';
import {
  createAbortError,
  downloadSavedTrackBlob,
  parseDriveFileId,
  type SavedTrackDownloadDependencies,
} from './saved-track-blob-download';
import {
  savedTrackDownloadProgressStore,
  type SavedTrackDownloadProgressStore,
} from './saved-track-download-progress';

// The download itself lives in `saved-track-blob-download`; this module keeps
// its public names so callers import from one place.
export {
  downloadSavedTrackBlob,
  isSavedTrackDownloadAbortError,
  parseDriveFileId,
  SLOW_SAVED_TRACK_DOWNLOAD_MS,
  type SavedTrackDownloadDependencies,
  type SavedTrackDownloadResponse,
} from './saved-track-blob-download';

let unkeyedDownloadCount = 0;

// Downloads still running, one per file and version. Each caller holds a
// waiter; a download is cancelled only when its last waiter leaves, so a
// superseded request never cancels bytes another caller still needs.
type SharedDownload = {
  controller: AbortController;
  /** Fans the download's progress out to every waiter's store. */
  progress: SavedTrackDownloadProgressStore;
  promise: Promise<Blob>;
  waiters: Set<Waiter>;
};

type Waiter = {
  cancelOnReset: boolean;
  release: () => void;
  store: SavedTrackDownloadProgressStore;
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
  /** The Drive file name, stored with the bytes for the offline files view. */
  name?: string;
  /** Drive content version; without one the bytes are never reused. */
  version?: string;
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
    const progress = createFanOutProgressStore(() => [
      ...new Set([...waiters].map((waiter) => waiter.store)),
    ]);
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
        { ...resolveDownloadDependencies(dependencies), store: progress },
      );

      if (cacheable) {
        // Not awaited: the player must not wait on storage.
        void persistence.write(driveFileId, version, blob, options);
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
      progress,
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
    const store = dependencies.store ?? savedTrackDownloadProgressStore;
    const waiter: Waiter = {
      cancelOnReset,
      release: () => {
        sharedDownload.waiters.delete(waiter);
        reject(createAbortError());

        // The download may go on for other waiters; this one's store must
        // not keep showing it.
        const shown = sharedDownload.progress.getSnapshot();

        if (shown.status === 'downloading') {
          clearStoreIfShowing(store, shown.downloadId);
        }

        if (sharedDownload.waiters.size === 0) {
          sharedDownload.controller.abort();
        }
      },
      store,
    };

    sharedDownload.waiters.add(waiter);

    // Joining a download already under way: show where it is now.
    const joined = sharedDownload.progress.getSnapshot();

    if (joined.status === 'downloading') {
      store.publish(joined);
    }

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
