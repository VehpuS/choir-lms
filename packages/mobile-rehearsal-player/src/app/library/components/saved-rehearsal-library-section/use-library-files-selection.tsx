import { useCallback, useEffect, useMemo, type ReactNode } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../../storage/local-library-storage';
import {
  createFilesPlaybackExpansionContext,
  getFilesRowSelectionState,
  getKeysSubsumedByFolder,
  orderFilesSelectionByRows,
  toFilesBulkSelectionItem,
  toFilesSelectionEntry,
  type FilesSelectionItem,
} from '../../saved-rehearsal-library/files-selection';
import {
  getLibraryFilesRowNodeKey,
  type LibraryFilesRow,
  type LibraryFilesSearchOptions,
} from '../../saved-rehearsal-library/library-files-model';
import { createPlaylistWithFilesLocation } from '../../saved-rehearsal-library/library-files-playlist-create';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import {
  assembleBulkActions,
  type BulkActionHandlers,
} from '../../selection/bulk-action-assembly';
import type { BulkAction } from '../../selection/bulk-action-model';
import { resolveBulkActions } from '../../selection/bulk-action-resolution';
import { useLibrarySelectionServices } from '../../selection/library-selection-services';
import { getSelectionCountLabel } from '../../selection/selection-copy';
import { SelectEntryButton } from '../../selection/select-entry-button';
import { SelectionBar } from '../../selection/selection-bar';
import { useBulkPlaybackActions } from '../../selection/use-bulk-playback-actions';
import { usePinnedBulkActionBar } from '../../selection/use-pinned-bulk-action-bar';
import { useSelection } from '../../selection/use-selection';
import type { ExplorerRowSelection } from '../explorer/model';
import { useLibraryFilesBulkNodeActions } from './use-library-files-bulk-node-actions';

export type FilesRowSelectionFactory = (
  row: LibraryFilesRow,
) => ExplorerRowSelection;

type UseLibraryFilesSelectionOptions = {
  files: UseLibraryFilesResult;
  rows: readonly LibraryFilesRow[];
  searchOptions: LibraryFilesSearchOptions;
};

type LibraryFilesSelectionControls = {
  /** Selection-mode chrome the view places: entry icon, bar, and sheets. */
  bulkNodes: ReactNode;
  entryButton: ReactNode;
  getRowSelection: FilesRowSelectionFactory;
  isActive: boolean;
  selectionBar: ReactNode;
};

/**
 * Selection mode for the Files view (task 9.8): the row identities, the
 * derived covered / partial states, `Select all` over the listed rows, and the
 * pinned bulk-action bar. The pure rules live in `files-selection.ts` and
 * `bulk-action-resolution.ts`; this only joins them to the screen.
 */
export const useLibraryFilesSelection = ({
  files,
  rows,
  searchOptions,
}: UseLibraryFilesSelectionOptions): LibraryFilesSelectionControls => {
  const services = useLibrarySelectionServices();
  const selection = useSelection<FilesSelectionItem>();
  const { tree } = files;

  // Selection ends when the tab is left, and drops nodes the tree no longer
  // has (deleted, moved away by a bulk action) without leaving the mode.
  useEffect(() => {
    if (!services.isDestinationActive) {
      selection.cancel();
    }
  }, [selection.cancel, services.isDestinationActive]);
  const { prune } = selection;

  useEffect(() => {
    if (tree) {
      prune(
        new Set([
          ...tree.folders.map(({ id }) => id),
          ...tree.fileLinks.map(({ id }) => id),
        ]),
      );
    }
  }, [prune, tree]);

  const orderedItems = useMemo(
    () => orderFilesSelectionByRows(selection.selectedItems, rows),
    [rows, selection.selectedItems],
  );
  const bulkItems = useMemo(
    () => orderedItems.map(toFilesBulkSelectionItem),
    [orderedItems],
  );
  const rowSelectionState = useMemo(
    () =>
      tree
        ? getFilesRowSelectionState({ items: orderedItems, rows, tree })
        : { coveredKeys: new Set<string>(), partialKeys: new Set<string>() },
    [orderedItems, rows, tree],
  );
  const expansionContext = useMemo(
    () =>
      createFilesPlaybackExpansionContext({
        savedLoops: services.collections.loops,
        savedPlaylists: services.collections.playlists,
        savedSources: services.collections.sources,
        searchOptions,
        tree: tree ?? {
          fileLinks: [],
          folders: [],
          rootFolderId: '',
          version: 1,
        },
      }),
    [searchOptions, services.collections, tree],
  );

  const createPlaylist = useCallback(
    async (playlist: Parameters<typeof services.createPlaylist>[0]) =>
      createPlaylistWithFilesLocation({
        createPlaylist: services.createPlaylist,
        files,
        playlist,
      }),
    [files, services.createPlaylist],
  );
  const playback = useBulkPlaybackActions({
    canQueue: services.canQueue,
    collections: services.collections,
    context: expansionContext,
    createPlaylist,
    items: bulkItems,
    onAcknowledge: services.acknowledge,
    onCompleted: selection.cancel,
    ownerId: LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
    queueItemsNext: services.queueItemsNext,
    queueItemsUpNext: services.queueItemsUpNext,
    updatePlaylist: services.updatePlaylist,
  });

  const nodeActions = useLibraryFilesBulkNodeActions({
    files,
    items: orderedItems,
    onCompleted: selection.cancel,
  });
  const handlers = useMemo<BulkActionHandlers>(
    () => ({
      'add-to-playlist': playback.run.addToPlaylist,
      'add-to-queue': playback.run.addToQueue,
      'play-next': playback.run.playNext,
      'save-as-playlist': playback.run.saveAsPlaylist,
      ...nodeActions.handlers,
    }),
    [nodeActions.handlers, playback.run],
  );
  const actions = useMemo<BulkAction[]>(
    () =>
      assembleBulkActions({
        canQueue: playback.canQueue,
        handlers,
        resolved: resolveBulkActions({
          effectivePlayableCount: playback.effectivePlayableCount,
          items: bulkItems,
          surface: 'files',
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

  const { coveredKeys, partialKeys } = rowSelectionState;
  const { deselectMany, enter, selectMany, selectedKeys, toggle } = selection;
  // Rows inside a selected folder are already brought in by that folder.
  const selectableRows = useMemo(
    () =>
      rows.filter((row) => !coveredKeys.has(getLibraryFilesRowNodeKey(row))),
    [coveredKeys, rows],
  );
  const selectableKeys = useMemo(
    () => selectableRows.map(getLibraryFilesRowNodeKey),
    [selectableRows],
  );
  const isAllSelected =
    selectableKeys.length > 0 &&
    selectableKeys.every((key) => selectedKeys.has(key));

  // Selecting a folder replaces the items already selected inside it.
  const selectEntries = useCallback(
    (entriesRows: readonly LibraryFilesRow[]) => {
      if (!tree) {
        return;
      }

      const subsumed = entriesRows.flatMap((row) =>
        row.kind === 'folder'
          ? getKeysSubsumedByFolder({
              folderId: row.folder.id,
              items: selection.selectedItems,
              tree,
            })
          : [],
      );

      if (subsumed.length > 0) {
        deselectMany(subsumed);
      }

      selectMany(entriesRows.map(toFilesSelectionEntry));
    },
    [deselectMany, selectMany, selection.selectedItems, tree],
  );

  const getRowSelection = useCallback<FilesRowSelectionFactory>(
    (row) => {
      const key = getLibraryFilesRowNodeKey(row);
      const isCovered = !selectedKeys.has(key) && coveredKeys.has(key);

      return {
        isActive: selection.isActive,
        isPartial: partialKeys.has(key),
        isSelected: isCovered || selectedKeys.has(key),
        // A folder's open control stays so a selection can span folders.
        keepsTrailingControls: row.kind === 'folder',
        onEnter: () => {
          enter(toFilesSelectionEntry(row));
        },
        onToggle: () => {
          if (isCovered) {
            return;
          }

          if (selectedKeys.has(key)) {
            toggle(toFilesSelectionEntry(row));
            return;
          }

          selectEntries([row]);
        },
      };
    },
    [
      coveredKeys,
      enter,
      partialKeys,
      selectEntries,
      selectedKeys,
      selection.isActive,
      toggle,
    ],
  );

  const toggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      deselectMany(selectableKeys);
      return;
    }

    selectEntries(
      selectableRows.filter(
        (row) => !selectedKeys.has(getLibraryFilesRowNodeKey(row)),
      ),
    );
  }, [
    deselectMany,
    isAllSelected,
    selectEntries,
    selectableKeys,
    selectableRows,
    selectedKeys,
  ]);

  return {
    bulkNodes: (
      <>
        {playback.nodes}
        {nodeActions.nodes}
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
        onCancel={selection.cancel}
        selectAll={{
          isAllSelected,
          isDisabled: selectableKeys.length === 0,
          onToggle: toggleSelectAll,
        }}
        selectedCount={selection.selectedCount}
      />
    ) : null,
  };
};
