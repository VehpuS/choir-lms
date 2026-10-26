import { useEffect, useSyncExternalStore } from 'react';

import { persistentAudioCache } from '../playback/audio-cache';
import {
  createOfflineStateStore,
  type OfflineState,
} from './offline-state-store';

export const offlineStateStore = createOfflineStateStore(persistentAudioCache);

/** A file's offline state; reads storage once on first use. */
export const useOfflineState = (driveFileId: string): OfflineState => {
  useEffect(() => {
    void offlineStateStore.refresh();
  }, []);

  return useSyncExternalStore(
    offlineStateStore.subscribe,
    () => offlineStateStore.getState(driveFileId),
    () => 'none' as const,
  );
};

/**
 * Re-renders a list when any file's offline state changes, for views that
 * build menus for many rows at once.
 */
export const useOfflineRevision = (): number => {
  useEffect(() => {
    void offlineStateStore.refresh();
  }, []);

  return useSyncExternalStore(
    offlineStateStore.subscribe,
    offlineStateStore.getRevision,
    () => 0,
  );
};
