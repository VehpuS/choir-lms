import { useSyncExternalStore } from 'react';

/** Asks for the re-link sheet for one `Stem missing` row; null closes it. */
export type RelinkRequest = { compositeId: string; stemId: string };

let request: RelinkRequest | null = null;
const listeners = new Set<() => void>();

const publish = (next: RelinkRequest | null) => {
  request = next;
  listeners.forEach((listener) => listener());
};

export const requestRelink = (next: RelinkRequest): void => {
  publish({ ...next });
};

export const closeRelink = (): void => {
  publish(null);
};

export const useRelinkRequest = (): RelinkRequest | null =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    () => request,
  );
