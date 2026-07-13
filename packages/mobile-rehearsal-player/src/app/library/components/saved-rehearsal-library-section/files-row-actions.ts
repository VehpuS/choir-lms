import {
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';

import { resolveSavedLoopRowActions } from '../../loops/utils/saved-loop-row-actions';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import {
  DISABLED_PLACEHOLDER_ACTIONS,
  FOLDER_ACTION_ORDER,
  LOOP_ACTION_LABELS,
  LOOP_ACTION_ORDER,
  PLAYLIST_ACTION_ORDER,
  TRACK_ACTION_LABELS,
  TRACK_ACTION_ORDER,
  getDeleteFromFolderConfirmationCopy,
  getTrackRemoveFromLibraryPlacementLabel,
  sortActionsByLabelOrder,
  toOptionsMenuAction,
} from './files-row-actions-contract';

type ResolveFilesRowMenuActionsBaseOptions = {
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  isLoopBuilderPreparing: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onOpenFolder: (folderId: string) => void;
  onOpenLoopBuilder: (sourceId: string) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onOpenSourcePlaylistSelector: (sourceId: string) => void;
  onOpenSourceTagEditor: (sourceId: string) => void;
  onOpenLoopTagEditor: (loopId: string) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onQueuePlayableItemNext: (playableItem: PlayableItem) => void;
  onQueuePlayableItemUpNext: (playableItem: PlayableItem) => void;
};

const resolveTrackMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'track' }>,
) => {
  const trackPlayableItem = createTrackPlayableItem(row.source);

  const primaryTrackActions = resolveSavedTrackRowActions({
    canMutateLibrary: options.canMutateLibrary,
    canMutateLoops: options.canMutateLoops,
    canMutatePlaylists: options.canMutatePlaylists,
    canQueueAsNext: options.canQueueAsNext,
    hasAvailableSource: row.isPlayable,
    hasSavedLoops: false,
    isLoopBuilderPreparing: options.isLoopBuilderPreparing,
    isLoopMutating: options.isLoopMutating,
    isPendingLoopSource: false,
    isPendingRemoval: false,
    isPlaybackSourceActive: false,
    isPlaylistMutating: options.isPlaylistMutating,
    isSavedLibraryMutating: options.isSavedLibraryMutating,
    onOpenLoopBuilder: () => {
      options.onOpenLoopBuilder(row.source.id);
    },
    onOpenTagEditor: () => {
      options.onOpenSourceTagEditor(row.source.id);
    },
    onOpenPlaylistSelector: () => {
      options.onOpenSourcePlaylistSelector(row.source.id);
    },
    onQueueNext: () => {
      options.onQueuePlayableItemNext(trackPlayableItem);
    },
    onQueueUpNext: () => {
      options.onQueuePlayableItemUpNext(trackPlayableItem);
    },
    onRemove: () => undefined,
    onTogglePlayback: () => undefined,
    onViewTrackLoops: () => undefined,
    playbackAction: {
      disabled: false,
      label: 'Play',
    },
    sourceName: row.source.name,
  })
    .filter((action) => {
      return (
        action.placement === 'menu' && TRACK_ACTION_LABELS.has(action.label)
      );
    })
    .map((action) => {
      return toOptionsMenuAction({
        action,
        id: `track:${row.fileLink.id}:${action.label}`,
      });
    });

  const actions = [
    ...primaryTrackActions,
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.createCopy,
      id: `track:${row.fileLink.id}:create-copy`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.rename,
      id: `track:${row.fileLink.id}:rename`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.moveToFolder,
      id: `track:${row.fileLink.id}:move-to-folder`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.deleteFromFolder,
      id: `track:${row.fileLink.id}:delete-from-folder`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.removeFromLibrary,
      id: `track:${row.fileLink.id}:remove-from-library`,
    },
  ];

  return sortActionsByLabelOrder(actions, TRACK_ACTION_ORDER);
};

const resolveLoopMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'loop' }>,
) => {
  const primaryLoopActions = resolveSavedLoopRowActions({
    canEditLoop: false,
    canMutateLoops: options.canMutateLoops,
    canMutatePlaylists: options.canMutatePlaylists,
    canQueueAsNext: options.canQueueAsNext,
    hasPlayableItem: row.playableItem !== null,
    isEditingLoop: false,
    isLoopActive: false,
    isLoopMutating: options.isLoopMutating,
    isPendingRemoval: false,
    isPlaylistMutating: options.isPlaylistMutating,
    itemName: row.loop.name,
    onEdit: () => undefined,
    onEditTags: () => {
      options.onOpenLoopTagEditor(row.loop.id);
    },
    onOpenPlaylistSelector: () => {
      options.onOpenLoopPlaylistSelector(row.loop.id);
    },
    onQueueNext: () => {
      if (!row.playableItem) {
        return;
      }

      options.onQueuePlayableItemNext(row.playableItem);
    },
    onQueueUpNext: () => {
      if (!row.playableItem) {
        return;
      }

      options.onQueuePlayableItemUpNext(row.playableItem);
    },
    onRemove: () => undefined,
    onTogglePlayback: () => undefined,
    playbackAction: {
      disabled: false,
      label: 'Play',
    },
  })
    .filter((action) => {
      return (
        action.placement === 'menu' && LOOP_ACTION_LABELS.has(action.label)
      );
    })
    .map((action) => {
      return toOptionsMenuAction({
        action,
        id: `loop:${row.fileLink.id}:${action.label}`,
      });
    });

  const actions = [
    ...primaryLoopActions,
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.createCopy,
      id: `loop:${row.fileLink.id}:create-copy`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.rename,
      id: `loop:${row.fileLink.id}:rename`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.moveToFolder,
      id: `loop:${row.fileLink.id}:move-to-folder`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.deleteFromFolder,
      id: `loop:${row.fileLink.id}:delete-from-folder`,
    },
  ];

  return sortActionsByLabelOrder(actions, LOOP_ACTION_ORDER);
};

const resolvePlaylistMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'playlist' }>,
) => {
  const actions = [
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.createCopy,
      id: `playlist:${row.fileLink.id}:create-copy`,
    },
    {
      disabled: !options.canMutatePlaylists || options.isPlaylistMutating,
      id: `playlist:${row.fileLink.id}:edit-tags`,
      label: 'Edit tags',
      onPress: () => {
        options.onOpenPlaylistTagEditor(row.playlist.id);
      },
      tone: 'secondary' as const,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.rename,
      id: `playlist:${row.fileLink.id}:rename`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.moveToFolder,
      id: `playlist:${row.fileLink.id}:move-to-folder`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.deleteFromFolder,
      id: `playlist:${row.fileLink.id}:delete-from-folder`,
    },
  ];

  return sortActionsByLabelOrder(actions, PLAYLIST_ACTION_ORDER);
};

const resolveFolderMenuActions = (
  _options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'folder' }>,
) => {
  const actions = [
    {
      disabled: true,
      id: `folder:${row.folder.id}:edit-tags`,
      label: 'Edit tags',
      onPress: () => undefined,
      tone: 'secondary' as const,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.rename,
      id: `folder:${row.folder.id}:rename`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.moveToFolder,
      id: `folder:${row.folder.id}:move-to-folder`,
    },
    {
      ...DISABLED_PLACEHOLDER_ACTIONS.deleteFromFolder,
      id: `folder:${row.folder.id}:delete-from-folder`,
    },
  ];

  return sortActionsByLabelOrder(actions, FOLDER_ACTION_ORDER);
};

export const resolveFilesRowMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions & {
    row: LibraryFilesRow;
  },
): OptionsMenuAction[] => {
  switch (options.row.kind) {
    case 'folder':
      return resolveFolderMenuActions(options, options.row);
    case 'loop':
      return resolveLoopMenuActions(options, options.row);
    case 'playlist':
      return resolvePlaylistMenuActions(options, options.row);
    case 'track':
      return resolveTrackMenuActions(options, options.row);
  }
};

export const resolveFilesRowMenuTitle = (row: LibraryFilesRow) => {
  if (row.kind === 'folder') {
    return row.folder.name;
  }

  return row.label;
};

export {
  getDeleteFromFolderConfirmationCopy,
  getTrackRemoveFromLibraryPlacementLabel,
};
