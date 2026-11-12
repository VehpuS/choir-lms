export type PersistentStorageStatus =
  | 'unknown'
  | 'granted'
  | 'denied'
  | 'unsupported';

// The slice of `navigator.storage` used here; the app's TypeScript config has
// no DOM library.
export type StorageManagerLike = {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
};

/**
 * Asks the browser not to clear this site's data (offline audio, recordings)
 * when it is short on space. The request is made once; a refusal is a normal
 * answer, not an error, and is kept so the Offline files screen can say so.
 * Where there is no storage manager (native) the status is `unsupported`.
 */
export const createPersistentStorage = (
  getManager: () => StorageManagerLike | undefined,
) => {
  let status: PersistentStorageStatus = 'unknown';
  let pending: Promise<PersistentStorageStatus> | null = null;
  const listeners = new Set<() => void>();

  const setStatus = (next: PersistentStorageStatus) => {
    status = next;
    listeners.forEach((listener) => {
      listener();
    });

    return next;
  };

  const resolve = async (): Promise<PersistentStorageStatus> => {
    const manager = getManager();

    if (!manager?.persist) {
      return setStatus('unsupported');
    }

    try {
      if (await manager.persisted?.()) {
        return setStatus('granted');
      }

      return setStatus((await manager.persist()) ? 'granted' : 'denied');
    } catch {
      return setStatus('denied');
    }
  };

  return {
    getStatus: () => status,
    /** Requests persistence the first time; later calls share that answer. */
    request: () => {
      pending ??= resolve();

      return pending;
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};
