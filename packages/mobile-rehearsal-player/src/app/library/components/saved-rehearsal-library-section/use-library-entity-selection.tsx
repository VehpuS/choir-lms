import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';
import {
  toFilesBulkSelectionItem,
  toFilesTagTargets,
} from '../../saved-rehearsal-library/files-selection';
import {
  assembleBulkActions,
  type BulkActionHandlers,
} from '../../selection/bulk-action-assembly';
import type { BulkAction } from '../../selection/bulk-action-model';
import {
  resolveBulkActions,
  type BulkSurface,
} from '../../selection/bulk-action-resolution';
import {
  createEntityExpansionContext,
  getEntitySelectionKey,
  getValidEntityKeys,
  orderEntitySelection,
  toEntityPlacementItems,
  toEntitySelectionEntry,
  type EntitySelectionRef,
} from '../../selection/entity-selection';
import { useLibrarySelectionServices } from '../../selection/library-selection-services';
import { getSelectionCountLabel } from '../../selection/selection-copy';
import { SelectEntryButton } from '../../selection/select-entry-button';
import { SelectionBar } from '../../selection/selection-bar';
import { useBulkPlaybackActions } from '../../selection/use-bulk-playback-actions';
import { useBulkTagEditor } from '../../selection/use-bulk-tag-editor';
import { usePinnedBulkActionBar } from '../../selection/use-pinned-bulk-action-bar';
import { useSelection } from '../../selection/use-selection';
import type { ExplorerRowSelection } from '../explorer/model';
import { useLibraryFilesBulkNodeActions } from './use-library-files-bulk-node-actions';

export type EntityRowSelectionFactory = (
  ref: EntitySelectionRef,
) => ExplorerRowSelection;

export type LibraryEntitySelectionControls = {
  /** Selection-mode sheets: choices prompt, playlist pickers, tags, folder picker. */
  bulkNodes: ReactNode;
  /** The shared `Select` icon, or null while selecting or with nothing to select. */
  entryButton: ReactNode;
  getRowSelection: EntityRowSelectionFactory;
  isActive: boolean;
  selectionBar: ReactNode;
};

type UseLibraryEntitySelectionOptions = {
  /** The rows on screen in display order; `Select all` covers exactly these. */
  rows: readonly EntitySelectionRef[];
  surface: Exclude<BulkSurface, 'files' | 'library-search' | 'playlist-detail'>;
};

/**
 * Selection mode for a Library list of entities (Tracks, Loops, Playlists,
 * tag detail; task 9.8): row identity by entity, `Select all` over the listed
 * rows, and the pinned bulk-action bar, joined to the same pure rules and
 * shared action hooks the Files view uses.
 */
export const useLibraryEntitySelection = ({
  rows,
  surface,
}: UseLibraryEntitySelectionOptions): LibraryEntitySelectionControls => {
  const services = useLibrarySelectionServices();
  const selection =
    useSelection<ReturnType<typeof toEntitySelectionEntry>['item']>();
  const { collections, files, folders } = services;
  const {
    cancel,
    deselectMany,
    enter,
    prune,
    selectMany,
    selectedKeys,
    toggle,
  } = selection;

  // Selection ends when the tab is left, and drops entities that no longer
  // exist (removed by a bulk action) without leaving the mode. Filtering a
  // row out of view does not drop it.
  useEffect(() => {
    if (!services.isDestinationActive) {
      cancel();
    }
  }, [cancel, services.isDestinationActive]);
  useEffect(() => {
    prune(
      getValidEntityKeys({
        folders,
        loops: collections.loops,
        playlists: collections.playlists,
        sources: collections.sources,
      }),
    );
  }, [collections, folders, prune]);

  const orderedItems = useMemo(
    () => orderEntitySelection(selection.selectedItems, rows),
    [rows, selection.selectedItems],
  );
  const bulkItems = useMemo(
    () => orderedItems.map(toFilesBulkSelectionItem),
    [orderedItems],
  );
  const expansionContext = useMemo(
    () => createEntityExpansionContext(collections.playlists),
    [collections.playlists],
  );
  const playback = useBulkPlaybackActions({
    canQueue: services.canQueue,
    collections,
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
  const getPlacementItems = useCallback(
    () => toEntityPlacementItems(orderedItems, folders),
    [folders, orderedItems],
  );
  const nodeActions = useLibraryFilesBulkNodeActions({
    files,
    getPlacementItems,
    items: orderedItems,
    onCompleted: cancel,
  });
  const tagTargets = useMemo(
    () => toFilesTagTargets(orderedItems),
    [orderedItems],
  );
  const tagEditor = useBulkTagEditor({
    onCompleted: cancel,
    targets: tagTargets,
  });

  const handlers = useMemo<BulkActionHandlers>(
    () => ({
      'add-to-playlist': playback.run.addToPlaylist,
      'add-to-queue': playback.run.addToQueue,
      'copy-to-folder': nodeActions.handlers['copy-to-folder'],
      'edit-tags': tagEditor.open,
      'play-next': playback.run.playNext,
      'remove-from-library': nodeActions.handlers['remove-from-library'],
      'save-as-playlist': playback.run.saveAsPlaylist,
    }),
    [nodeActions.handlers, playback.run, tagEditor.open],
  );
  const actions = useMemo<BulkAction[]>(
    () =>
      assembleBulkActions({
        canQueue: playback.canQueue,
        handlers,
        resolved: resolveBulkActions({
          effectivePlayableCount: playback.effectivePlayableCount,
          items: bulkItems,
          surface,
        }),
      }),
    [
      bulkItems,
      handlers,
      playback.canQueue,
      playback.effectivePlayableCount,
      surface,
    ],
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

  const rowKeys = useMemo(() => rows.map(getEntitySelectionKey), [rows]);
  const isAllSelected =
    rowKeys.length > 0 && rowKeys.every((key) => selectedKeys.has(key));
  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      deselectMany(rowKeys);
      return;
    }

    selectMany(
      rows
        .filter((ref) => !selectedKeys.has(getEntitySelectionKey(ref)))
        .map(toEntitySelectionEntry),
    );
  }, [deselectMany, isAllSelected, rowKeys, rows, selectMany, selectedKeys]);

  const getRowSelection = useCallback<EntityRowSelectionFactory>(
    (ref) => ({
      isActive: selection.isActive,
      isSelected: selectedKeys.has(getEntitySelectionKey(ref)),
      onEnter: () => {
        enter(toEntitySelectionEntry(ref));
      },
      onToggle: () => {
        toggle(toEntitySelectionEntry(ref));
      },
    }),
    [enter, selectedKeys, selection.isActive, toggle],
  );

  return {
    bulkNodes: (
      <>
        {playback.nodes}
        {nodeActions.nodes}
        {tagEditor.node}
      </>
    ),
    entryButton:
      !selection.isActive && rows.length > 0 ? (
        <SelectEntryButton onPress={() => enter()} />
      ) : null,
    getRowSelection,
    isActive: selection.isActive,
    selectionBar: selection.isActive ? (
      <SelectionBar
        onCancel={cancel}
        selectAll={{
          isAllSelected,
          isDisabled: rowKeys.length === 0,
          onToggle: toggleSelectAll,
        }}
        selectedCount={selection.selectedCount}
      />
    ) : null,
  };
};
