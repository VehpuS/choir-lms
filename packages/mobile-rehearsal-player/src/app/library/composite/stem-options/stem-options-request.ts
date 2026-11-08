import { useSyncExternalStore } from 'react';

/**
 * Asks for the stem options sheet for one stem of a composite. The Mix panel's
 * stem rows (task 6.1) are the caller; the host that renders the sheet is
 * mounted once for the app. Null closes the sheet.
 */
export type StemOptionsRequest = { compositeId: string; stemId: string };

let request: StemOptionsRequest | null = null;
const listeners = new Set<() => void>();

const publish = (next: StemOptionsRequest | null) => {
  request = next;
  listeners.forEach((listener) => listener());
};

export const requestStemOptions = (next: StemOptionsRequest): void => {
  publish({ ...next });
};

export const closeStemOptions = (): void => {
  publish(null);
};

export const useStemOptionsRequest = (): StemOptionsRequest | null =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    () => request,
  );
