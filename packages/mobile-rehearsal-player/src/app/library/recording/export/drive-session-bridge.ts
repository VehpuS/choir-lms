import { useSyncExternalStore } from 'react';

/**
 * What the Drive session looks like to places outside the router. Only the
 * router holds the session's authorization, so it publishes whether the write
 * permission is granted here and registers the way to ask for it; Settings
 * reads and uses these without being handed the session. No token is kept here.
 */

export type DriveSessionState = { hasWriteAccess: boolean; isBusy: boolean };

const SIGNED_OUT: DriveSessionState = { hasWriteAccess: false, isBusy: false };

let state = SIGNED_OUT;
let requestHandler: (() => void) | null = null;
const listeners = new Set<() => void>();

export const publishDriveSession = (next: DriveSessionState) => {
  if (
    next.hasWriteAccess === state.hasWriteAccess &&
    next.isBusy === state.isBusy
  ) {
    return;
  }

  state = next;
  listeners.forEach((listener) => listener());
};

export const registerDriveWriteAccessRequest = (handler: () => void) => {
  requestHandler = handler;

  return () => {
    if (requestHandler === handler) {
      requestHandler = null;
    }
  };
};

/** Starts the Google permission flow; does nothing where no router has registered. */
export const requestDriveWriteAccess = () => {
  requestHandler?.();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useDriveSessionState = (): DriveSessionState =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => SIGNED_OUT,
  );

let folderChoiceHandler: (() => void) | null = null;

/** The router-level host registers how to open the Drive folder picker, which needs the session's token. */
export const registerExportFolderChoice = (handler: () => void) => {
  folderChoiceHandler = handler;

  return () => {
    if (folderChoiceHandler === handler) {
      folderChoiceHandler = null;
    }
  };
};

/** `Change` on the folder row: opens the picker over whatever is showing. */
export const requestExportFolderChoice = () => {
  folderChoiceHandler?.();
};
