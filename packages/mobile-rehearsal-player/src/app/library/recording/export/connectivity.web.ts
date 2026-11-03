import type { Connectivity } from './auto-export-queue';
import type { ConnectionType } from './auto-export-model';

// The app's TypeScript config carries no DOM library, so the slice of the
// browser API used here is described structurally (as in `peak-extractor.web`).
type NetworkInformation = {
  type?: string;
  addEventListener?: (name: 'change', listener: () => void) => void;
  removeEventListener?: (name: 'change', listener: () => void) => void;
};

type BrowserScope = {
  navigator?: { onLine?: boolean; connection?: NetworkInformation };
  addEventListener?: (name: 'online' | 'offline', listener: () => void) => void;
  removeEventListener?: (
    name: 'online' | 'offline',
    listener: () => void,
  ) => void;
};

const scope = (): BrowserScope => globalThis as unknown as BrowserScope;

const KNOWN_TYPES: ReadonlySet<string> = new Set([
  'wifi',
  'ethernet',
  'cellular',
]);

const readConnectionType = (): ConnectionType => {
  const type = scope().navigator?.connection?.type;

  return type !== undefined && KNOWN_TYPES.has(type)
    ? (type as ConnectionType)
    : 'unknown';
};

/**
 * Chrome on Android reports `wifi`, `ethernet` or `cellular`; Safari and
 * Firefox have no connection information and desktop Chrome usually reports
 * nothing useful, so most of the time the type is `unknown` and uploads run on
 * any connection (rehearsal-recording design Decision 19).
 */
export const appConnectivity: Connectivity = {
  connectionType: readConnectionType,
  isOnline: () => scope().navigator?.onLine !== false,
  subscribe: (listener) => {
    const { connection } = scope().navigator ?? {};
    const target = scope();

    target.addEventListener?.('online', listener);
    target.addEventListener?.('offline', listener);
    connection?.addEventListener?.('change', listener);

    return () => {
      target.removeEventListener?.('online', listener);
      target.removeEventListener?.('offline', listener);
      connection?.removeEventListener?.('change', listener);
    };
  },
};

/** Whether this browser reports the connection type at all. */
export const canTellConnectionType = (): boolean =>
  typeof scope().navigator?.connection?.type === 'string';
