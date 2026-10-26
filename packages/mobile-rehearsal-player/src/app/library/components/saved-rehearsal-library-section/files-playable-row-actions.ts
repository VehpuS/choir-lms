import { createTrackPlayableItem } from '@org/audio-library-models';

import {
  resolveSavedLoopMenu,
  resolveSavedTrackMenu,
} from '../saved-item-menu/saved-item-menus';
import { createLyricsMenuState } from '../../lyrics/utils/lyrics-menu-action';
import { createOfflineMenuState } from '../../offline/offline-menu-action';
import { createMarkersMenuState } from '../../markers/utils/markers-menu-action';
import { createSheetMusicMenuState } from '../../sheet-music/utils/sheet-music-menu-action';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import type {
  FileLinkLibraryFilesRow,
  ResolveFilesRowMenuActionsBaseOptions,
} from './files-row-actions-model';

/**
 * Files' own actions on a track, loop, or playlist link: they act on this
 * file link only, so they are the view actions every Files item menu adds to
 * its shared saved-item menu (task 2.12).
 */
export const resolveFileLinkViewActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: FileLinkLibraryFilesRow,
): OptionsMenuAction[] => {
  const disabled = !options.canMutateLibrary || options.isSavedLibraryMutating;
  const idPrefix = `${row.kind}:${row.fileLink.id}`;

  return [
    {
      disabled,
      id: `${idPrefix}:create-copy`,
      label: 'Create a copy',
      onPress: () => {
        options.onCreateFileLinkCopy(row);
      },
      tone: 'secondary',
    },
    {
      disabled,
      id: `${idPrefix}:rename`,
      label: 'Rename',
      onPress: () => {
        options.onRenameFileNode(row);
      },
      tone: 'secondary',
    },
    {
      disabled,
      id: `${idPrefix}:move-to-folder`,
      label: 'Move to folder',
      onPress: () => {
        options.onMoveFileNode(row);
      },
      tone: 'secondary',
    },
    {
      disabled,
      id: `${idPrefix}:delete-from-folder`,
      label: 'Delete from folder',
      onPress: () => {
        options.onDeleteFileNode(row);
      },
      tone: 'destructive',
    },
  ];
};

export const resolveTrackMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'track' }>,
): OptionsMenuAction[] => {
  const trackPlayableItem = createTrackPlayableItem(row.source);

  return resolveSavedTrackMenu(
    {
      canMutateLibrary: options.canMutateLibrary,
      canMutateLoops: options.canMutateLoops,
      canMutatePlaylists: options.canMutatePlaylists,
      canQueueAsNext: options.canQueueAsNext,
      canReconnect: options.canReconnectLibrarySource,
      isLoopBuilderPreparing: options.isLoopBuilderPreparing,
      isLoopMutating: options.isLoopMutating,
      isPendingLoopSource: options.pendingLoopBuilderSourceId === row.source.id,
      isPendingRemoval: false,
      isPlaylistMutating: options.isPlaylistMutating,
      isSavedLibraryMutating: options.isSavedLibraryMutating,
      loopCount: row.loopCount ?? 0,
      lyrics: createLyricsMenuState({
        hasLyrics: options.hasLyricsFor(row.source.id),
        id: row.source.id,
        kind: 'track',
      }),
      sheetMusic: createSheetMusicMenuState({
        id: row.source.id,
        kind: 'track',
      }),
      markers: createMarkersMenuState({ id: row.source.id, kind: 'track' }),
      offline: createOfflineMenuState({
        driveFileId: row.source.driveFileId,
        id: row.source.id,
        kind: 'track',
        modifiedTime: row.source.modifiedTime,
      }),
      onAddToPlaylist: () => {
        options.onOpenSourcePlaylistSelector(row.source.id);
      },
      onAddToQueue: () => {
        options.onQueuePlayableItemUpNext(trackPlayableItem);
      },
      onEditTags: () => {
        options.onOpenSourceTagEditor(row.source.id);
      },
      onMakeLoop: () => {
        options.onOpenLoopBuilder(row.source.id);
      },
      onOpenInGoogleDrive: () => {
        options.onOpenSourceInGoogleDrive(row.source.id);
      },
      onPlayNext: () => {
        options.onQueuePlayableItemNext(trackPlayableItem);
      },
      onReconnect: () => {
        options.onReconnectLibrarySource(row.source.id);
      },
      onRemoveFromLibrary: () => {
        options.onRemoveLibrarySource(row.source.id);
      },
      onShowInAdd: () => {
        options.onShowSourceInAdd(row.source.id);
      },
      onViewTrackLoops: () => {
        options.onViewTrackLoops(row.source.id);
      },
      pendingSourceLocationAction: options.pendingSourceLocationAction,
      source: row.source,
    },
    {
      idPrefix: `track:${row.fileLink.id}`,
      viewActions: resolveFileLinkViewActions(options, row),
    },
  );
};

export const resolveLoopMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'loop' }>,
): OptionsMenuAction[] => {
  return resolveSavedLoopMenu(
    {
      canEditLoop: row.source !== null,
      canMutateLoops: options.canMutateLoops,
      canMutatePlaylists: options.canMutatePlaylists,
      canQueueAsNext: options.canQueueAsNext,
      hasPlayableItem: row.playableItem !== null,
      isEditingLoop: false,
      isLoopMutating: options.isLoopMutating,
      isPendingRemoval: false,
      isPlaylistMutating: options.isPlaylistMutating,
      loopName: row.loop.name,
      lyrics: createLyricsMenuState({
        hasLyrics: options.hasLyricsFor(row.loop.sourceId),
        id: row.loop.id,
        kind: 'loop',
      }),
      sheetMusic: createSheetMusicMenuState({
        id: row.loop.id,
        kind: 'loop',
      }),
      // A loop whose track is gone has no markers to show.
      markers:
        row.source !== null
          ? createMarkersMenuState({ id: row.loop.id, kind: 'loop' })
          : undefined,
      offline:
        row.source !== null
          ? createOfflineMenuState({
              driveFileId: row.source.driveFileId,
              id: row.loop.id,
              kind: 'loop',
              modifiedTime: row.source.modifiedTime,
            })
          : undefined,
      onAddToPlaylist: () => {
        options.onOpenLoopPlaylistSelector(row.loop.id);
      },
      onAddToQueue: () => {
        if (row.playableItem) {
          options.onQueuePlayableItemUpNext(row.playableItem);
        }
      },
      // Edit mode for this loop, as in the Loops view; not a new-loop builder.
      onEditLoop: () => {
        options.onEditLoop(row.loop);
      },
      onEditTags: () => {
        options.onOpenLoopTagEditor(row.loop.id);
      },
      onPlayNext: () => {
        if (row.playableItem) {
          options.onQueuePlayableItemNext(row.playableItem);
        }
      },
      onRemoveFromLibrary: () => {
        options.onRemoveLoop(row.loop);
      },
    },
    {
      idPrefix: `loop:${row.fileLink.id}`,
      viewActions: resolveFileLinkViewActions(options, row),
    },
  );
};
