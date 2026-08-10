import { createTrackPlayableItem } from '@org/audio-library-models';

import { resolveSavedLoopRowActions } from '../../loops/utils/saved-loop-row-actions';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import {
  LOOP_ACTION_LABELS,
  LOOP_ACTION_ORDER,
  TRACK_ACTION_LABELS,
  TRACK_ACTION_ORDER,
  attachFilesRowActionSections,
  sortActionsByLabelOrder,
  toOptionsMenuAction,
} from './files-row-actions-contract';
import type { ResolveFilesRowMenuActionsBaseOptions } from './files-row-actions-model';

export const resolveTrackMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'track' }>,
): OptionsMenuAction[] => {
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
    isPendingLoopSource: options.pendingLoopBuilderSourceId === row.source.id,
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
  const actions: OptionsMenuAction[] = [
    ...primaryTrackActions,
    ...(row.source.availability.status !== 'available'
      ? [
          {
            disabled: !options.canReconnectLibrarySource,
            id: `track:${row.fileLink.id}:reconnect`,
            label: 'Reconnect',
            onPress: () => {
              options.onReconnectLibrarySource(row.source.id);
            },
          },
        ]
      : []),
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `track:${row.fileLink.id}:create-copy`,
      label: 'Create a copy',
      onPress: () => {
        options.onCreateFileLinkCopy(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `track:${row.fileLink.id}:rename`,
      label: 'Rename',
      onPress: () => {
        options.onRenameFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `track:${row.fileLink.id}:move-to-folder`,
      label: 'Move to folder',
      onPress: () => {
        options.onMoveFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `track:${row.fileLink.id}:delete-from-folder`,
      label: 'Delete from folder',
      onPress: () => {
        options.onDeleteFileNode(row);
      },
      tone: 'destructive',
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `track:${row.fileLink.id}:remove-from-library`,
      label: 'Remove from library',
      onPress: () => {
        options.onRemoveLibrarySource(row.source.id);
      },
      tone: 'destructive',
    },
  ];

  return attachFilesRowActionSections(
    sortActionsByLabelOrder(actions, TRACK_ACTION_ORDER),
  );
};

export const resolveLoopMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'loop' }>,
): OptionsMenuAction[] => {
  const primaryLoopActions = resolveSavedLoopRowActions({
    canEditLoop: row.source !== null,
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
    onEdit: () => {
      if (row.source) {
        options.onOpenLoopBuilder(row.source.id);
      }
    },
    onEditTags: () => {
      options.onOpenLoopTagEditor(row.loop.id);
    },
    onOpenPlaylistSelector: () => {
      options.onOpenLoopPlaylistSelector(row.loop.id);
    },
    onQueueNext: () => {
      if (row.playableItem) {
        options.onQueuePlayableItemNext(row.playableItem);
      }
    },
    onQueueUpNext: () => {
      if (row.playableItem) {
        options.onQueuePlayableItemUpNext(row.playableItem);
      }
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
  const actions: OptionsMenuAction[] = [
    ...primaryLoopActions,
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `loop:${row.fileLink.id}:create-copy`,
      label: 'Create a copy',
      onPress: () => {
        options.onCreateFileLinkCopy(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `loop:${row.fileLink.id}:rename`,
      label: 'Rename',
      onPress: () => {
        options.onRenameFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `loop:${row.fileLink.id}:move-to-folder`,
      label: 'Move to folder',
      onPress: () => {
        options.onMoveFileNode(row);
      },
    },
    {
      disabled: !options.canMutateLibrary || options.isSavedLibraryMutating,
      id: `loop:${row.fileLink.id}:delete-from-folder`,
      label: 'Delete from folder',
      onPress: () => {
        options.onDeleteFileNode(row);
      },
      tone: 'destructive',
    },
  ];

  return attachFilesRowActionSections(
    sortActionsByLabelOrder(actions, LOOP_ACTION_ORDER),
  );
};
