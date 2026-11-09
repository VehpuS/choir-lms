import { useSyncExternalStore } from 'react';

/**
 * Asks for the create sheet for some tracks (`Make composite…`). A request is
 * the selected track ids in selection order; null closes the sheet. The host
 * that renders the sheet is mounted once for the app.
 */
let request: readonly string[] | null = null;
let onCreated: (() => void) | undefined;
const listeners = new Set<() => void>();

const publish = (next: readonly string[] | null) => {
  request = next;
  listeners.forEach((listener) => listener());
};

/**
 * `onCreated` runs only when the sheet's `Create` is pressed (not on cancel),
 * so the asker can end its selection then (composite-tracks 12.7).
 */
export const requestCompositeCreate = (
  trackIds: readonly string[],
  whenCreated?: () => void,
): void => {
  onCreated = whenCreated;
  publish([...trackIds]);
};

export const closeCompositeCreate = (): void => {
  onCreated = undefined;
  publish(null);
};

/** `Create` was pressed: tell the asker, then close the sheet. */
export const completeCompositeCreate = (): void => {
  const notify = onCreated;

  closeCompositeCreate();
  notify?.();
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
