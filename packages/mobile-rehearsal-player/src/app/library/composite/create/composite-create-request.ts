import { useSyncExternalStore } from 'react';

/**
 * Asks for the create sheet for some tracks (`Make composite…`). A request is
 * the selected track ids in selection order; null closes the sheet. The host
 * that renders the sheet is mounted once for the app.
 */
let request: readonly string[] | null = null;
const listeners = new Set<() => void>();

const publish = (next: readonly string[] | null) => {
  request = next;
  listeners.forEach((listener) => listener());
};

export const requestCompositeCreate = (trackIds: readonly string[]): void => {
  publish([...trackIds]);
};

export const closeCompositeCreate = (): void => {
  publish(null);
};

export const useCompositeCreateRequest = (): readonly string[] | null =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    () => request,
  );
