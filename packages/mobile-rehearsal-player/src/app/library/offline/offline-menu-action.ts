import type { OptionsMenuAction } from '../components/options-menu-sheet/model';
import {
  DOWNLOADING_OFFLINE_LABEL,
  KEEP_OFFLINE_LABEL,
  REMOVE_OFFLINE_LABEL,
  requestSavedItemAction,
} from '../components/saved-item-menu/saved-item-requests';
import { isOfflineStorageSupported } from './offline-actions';
import { offlineStateStore } from './offline-state';
import type { OfflineState } from './offline-state-store';

/** What a Library menu needs to offer keeping one item's file offline. */
export type OfflineMenuState = {
  /** False for a file with no Drive version, which cannot be cached. */
  canKeep: boolean;
  onKeep: () => void;
  onRemove: () => void;
  state: OfflineState;
};

/**
 * `Keep offline` for a file that is not kept (including one cached
 * automatically), `Remove from offline` for a kept file, and a disabled
 * `Downloading…` in the same place while the copy is being fetched.
 */
export const resolveOfflineMenuActions = (
  offline: OfflineMenuState | undefined,
  idPrefix: string,
): OptionsMenuAction[] => {
  if (!offline) {
    return [];
  }

  if (offline.state === 'downloading') {
    return [
      {
        disabled: true,
        id: `${idPrefix}:keep-offline`,
        label: DOWNLOADING_OFFLINE_LABEL,
        onPress: () => undefined,
        tone: 'secondary',
      },
    ];
  }

  if (offline.state === 'kept') {
    return [
      {
        id: `${idPrefix}:remove-offline`,
        label: REMOVE_OFFLINE_LABEL,
        onPress: offline.onRemove,
        tone: 'secondary',
      },
    ];
  }

  return [
    {
      disabled: !offline.canKeep,
      id: `${idPrefix}:keep-offline`,
      label: KEEP_OFFLINE_LABEL,
      onPress: offline.onKeep,
      tone: 'secondary',
    },
  ];
};

/**
 * Menu state for a track (by source id) or a loop (by loop id), reading the
 * file's current state. Undefined where nothing can be kept offline (native
 * for now), so the entries do not appear.
 */
export const createOfflineMenuState = (options: {
  driveFileId: string;
  id: string;
  kind: 'loop' | 'track';
  modifiedTime?: string;
}): OfflineMenuState | undefined => {
  if (!isOfflineStorageSupported) {
    return undefined;
  }

  const { id, kind } = options;

  return {
    canKeep: options.modifiedTime !== undefined,
    onKeep: () => {
      requestSavedItemAction({ action: 'keep-offline', id, kind });
    },
    onRemove: () => {
      requestSavedItemAction({ action: 'remove-offline', id, kind });
    },
    state: offlineStateStore.getState(options.driveFileId),
  };
};

/** The track menu's offline state for a saved source. */
export const createSourceOfflineMenuState = (source: {
  driveFileId: string;
  id: string;
  modifiedTime?: string;
}) => {
  return createOfflineMenuState({ ...source, kind: 'track' });
};
