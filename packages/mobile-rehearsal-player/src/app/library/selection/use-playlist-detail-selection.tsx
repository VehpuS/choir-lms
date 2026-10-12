import type { Playlist } from '@org/audio-library-models';
import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

import {
  getRemoveFromPlaylistAcknowledgment,
  getRemoveFromPlaylistConfirmation,
  orderPlaylistEntrySelection,
  toPlaylistEntryBulkItem,
  toPlaylistEntrySelectionEntry,
  type PlaylistEntrySelectionItem,
} from '../playlists/utils/playlist-entry-selection';
import {
  assembleBulkActions,
  type BulkActionHandlers,
} from './bulk-action-assembly';
import type { BulkAction } from './bulk-action-model';
import { resolveBulkActions } from './bulk-action-resolution';
import { createEntityExpansionContext } from './entity-selection';
import { useLibrarySelectionServices } from './library-selection-services';
import { getSelectionCountLabel } from './selection-copy';
import { SelectEntryButton } from './select-entry-button';
import { SelectionBar } from './selection-bar';
import { useBulkPlaybackActions } from './use-bulk-playback-actions';
import { usePinnedBulkActionBar } from './use-pinned-bulk-action-bar';
import { useSelection } from './use-selection';
import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import type { ExplorerRowSelection } from '../components/explorer/model';
import { useLibraryFilesConfirmationFlow } from './use-library-files-confirmation-flow';

type PlaylistEntry = Playlist['items'][number];

type UsePlaylistDetailSelectionOptions = {
  entries: readonly PlaylistEntry[];
  playlist: Pick<Playlist, 'id' | 'name'> | null;
};

export type PlaylistDetailSelectionControls = {
  bulkNodes: ReactNode;
  entryButton: ReactNode;
  getRowSelection: (entry: PlaylistEntry) => ExplorerRowSelection;
  isActive: boolean;
  selectionBar: ReactNode;
};

/**
 * Selection mode for playlist detail (task 9.8): rows are the playlist's
 * entries, so a repeated item is two rows and removal acts on the occurrence.
 * Reordering is off while selecting because the selection rows carry no drag
 * handle or stepper.
 */
export const usePlaylistDetailSelection = ({
  entries,
  playlist,
}: UsePlaylistDetailSelectionOptions): PlaylistDetailSelectionControls => {
  const services = useLibrarySelectionServices();
  const confirmationFlow = useLibraryFilesConfirmationFlow();
  const selection = useSelection<PlaylistEntrySelectionItem>();
  const {
    cancel,
    deselectMany,
    enter,
    prune,
    selectMany,
    selectedKeys,
    toggle,
  } = selection;

  useEffect(() => {
    if (!services.isDestinationActive) {
      cancel();
    }
  }, [cancel, services.isDestinationActive]);
  useEffect(() => {
    prune(new Set(entries.map(({ id }) => id)));
  }, [entries, prune]);

  const orderedItems = useMemo(
    () => orderPlaylistEntrySelection(selection.selectedItems, entries),
    [entries, selection.selectedItems],
  );
  const bulkItems = useMemo(
    () => orderedItems.map(toPlaylistEntryBulkItem),
    [orderedItems],
  );
  const expansionContext = useMemo(
    () => createEntityExpansionContext(services.collections.playlists),
    [services.collections.playlists],
  );
  const playback = useBulkPlaybackActions({
    canQueue: services.canQueue,
    collections: services.collections,
    context: expansionContext,
    createPlaylist: services.createPlaylist,
    items: bulkItems,
    onAcknowledge: services.acknowledge,
    onCompleted: cancel,
    ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    queueItemsNext: services.queueItemsNext,
    queueItemsUpNext: services.queueItemsUpNext,
    updatePlaylist: services.updatePlaylist,
  });

  const removeFromPlaylist = useCallback(() => {
    if (!playlist || orderedItems.length === 0) {
      return;
    }

    const copy = {
      count: orderedItems.length,
      playlistName: playlist.name,
    };
    const entryIds = orderedItems.map(({ entryId }) => entryId);

    confirmationFlow.requestConfirmation({
      content: getRemoveFromPlaylistConfirmation(copy),
      onConfirm: async () => {
        if (
          await services.files.bulk.removePlaylistEntries(playlist.id, entryIds)
        ) {
          services.acknowledge(getRemoveFromPlaylistAcknowledgment(copy));
          cancel();
        }
      },
    });
  }, [cancel, confirmationFlow, orderedItems, playlist, services]);

  const handlers = useMemo<BulkActionHandlers>(
    () => ({
      'add-to-playlist': playback.run.addToPlaylist,
      'add-to-queue': playback.run.addToQueue,
      'play-next': playback.run.playNext,
      'remove-from-playlist': removeFromPlaylist,
      'save-as-playlist': playback.run.saveAsPlaylist,
    }),
    [playback.run, removeFromPlaylist],
  );
  const actions = useMemo<BulkAction[]>(
    () =>
      assembleBulkActions({
        canQueue: playback.canQueue,
        handlers,
        resolved: resolveBulkActions({
          effectivePlayableCount: playback.effectivePlayableCount,
          items: bulkItems,
          surface: 'playlist-detail',
        }),
      }),
    [bulkItems, handlers, playback.canQueue, playback.effectivePlayableCount],
  );
  const overflowTitle = getSelectionCountLabel(selection.selectedCount);

  usePinnedBulkActionBar(
    useMemo(
      () =>
        selection.isActive && services.isDestinationActive
          ? { actions, overflowTitle }
          : null,
      [
        actions,
        overflowTitle,
        selection.isActive,
        services.isDestinationActive,
      ],
    ),
  );

  const entryIds = useMemo(() => entries.map(({ id }) => id), [entries]);
  const isAllSelected =
    entryIds.length > 0 && entryIds.every((id) => selectedKeys.has(id));
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      deselectMany(entryIds);
      return;
    }

    selectMany(
      entries
        .filter((entry) => !selectedKeys.has(entry.id))
        .map(toPlaylistEntrySelectionEntry),
    );
  }, [
    deselectMany,
    entries,
    entryIds,
    isAllSelected,
    selectMany,
    selectedKeys,
  ]);

  const getRowSelection = useCallback(
    (entry: PlaylistEntry): ExplorerRowSelection => ({
      isActive: selection.isActive,
      isSelected: selectedKeys.has(entry.id),
      onEnter: () => {
        enter(toPlaylistEntrySelectionEntry(entry));
      },
      onToggle: () => {
        toggle(toPlaylistEntrySelectionEntry(entry));
      },
    }),
    [enter, selectedKeys, selection.isActive, toggle],
  );

  return {
    bulkNodes: (
      <>
        {playback.nodes}
        {confirmationFlow.confirmationDialog}
      </>
    ),
    entryButton:
      !selection.isActive && entries.length > 0 ? (
        <SelectEntryButton onPress={() => enter()} />
      ) : null,
    getRowSelection,
    isActive: selection.isActive,
    selectionBar: selection.isActive ? (
      <SelectionBar
        onCancel={cancel}
        selectAll={{
          isAllSelected,
          isDisabled: entryIds.length === 0,
          onToggle: toggleSelectAll,
        }}
        selectedCount={selection.selectedCount}
      />
    ) : null,
  };
};
