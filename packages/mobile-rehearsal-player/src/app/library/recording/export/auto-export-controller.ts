import type { DriveUploadFailureReason } from '@org/google-drive';
import { useSyncExternalStore } from 'react';

import type { AutoExportStatus } from './auto-export-queue';

/**
 * Where the running queue and the folder setup report to, and where the screens
 * ask them for something (`Retry` on a row). The host in the router owns the
 * queue; everything else reads and calls through here.
 */

export type AutoExportFolderState =
  | { state: 'idle' }
  | { state: 'creating' }
  | { state: 'failed'; reason: DriveUploadFailureReason };

export type AutoExportControllerState = {
  status: AutoExportStatus;
  folder: AutoExportFolderState;
};

const INITIAL: AutoExportControllerState = {
  folder: { state: 'idle' },
  status: { gate: { reason: 'off', state: 'held' } },
};

let state = INITIAL;
let retryHandler: ((recordingId: string) => Promise<void>) | null = null;
const listeners = new Set<() => void>();

const publish = (next: AutoExportControllerState) => {
  state = next;
  listeners.forEach((listener) => listener());
};

export const publishAutoExportStatus = (status: AutoExportStatus) => {
  publish({ ...state, status });
};

export const publishAutoExportFolderState = (folder: AutoExportFolderState) => {
  publish({ ...state, folder });
};

export const attachAutoExportRetry = (
  handler: (recordingId: string) => Promise<void>,
) => {
  retryHandler = handler;

  return () => {
    if (retryHandler === handler) {
      retryHandler = null;
    }
  };
};

/** `Retry` on a row: forget the failures and try again now. */
export const retryAutoExport = async (recordingId: string): Promise<void> => {
  await retryHandler?.(recordingId);
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const useAutoExportController = (): AutoExportControllerState =>
  useSyncExternalStore(
    subscribe,
    () => state,
    () => INITIAL,
  );
