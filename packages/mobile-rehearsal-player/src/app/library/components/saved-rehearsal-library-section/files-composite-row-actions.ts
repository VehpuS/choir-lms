import { resolveCompositeRowMenu } from '../../composite/list/composite-row-actions';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import { attachRowActionSections } from '../options-menu-sheet/row-action-sections';
import type { ResolveFilesRowMenuActionsBaseOptions } from './files-row-actions-model';

const MOVE_TO_FOLDER_LABEL = 'Move to folder';
const MOVE_ACTION_ID = 'move-to-folder';
const AFTER_PLAYLIST_ACTION_ID = 'add-to-playlist';

/**
 * A composite file's menu is the Composites view's menu (queue, playlist,
 * `Keep all stems offline`, rename, delete) with `Move to folder`, which moves
 * only the composite and never its stems' files (composite-tracks 7.5).
 * Rename and delete act on the file, as for any other file in Files.
 */
export const resolveCompositeFileMenuActions = (
  options: ResolveFilesRowMenuActionsBaseOptions,
  row: Extract<LibraryFilesRow, { kind: 'composite' }>,
): OptionsMenuAction[] => {
  const mutationBlocked =
    !options.canMutateLibrary || options.isSavedLibraryMutating;
  const playableItem = row.playableItem;
  const base = resolveCompositeRowMenu({
    canAddToPlaylist: options.canMutatePlaylists && !options.isPlaylistMutating,
    canQueueAsNext: options.canQueueAsNext,
    isPlayable: playableItem !== null,
    offlineActions: options.getCompositeOfflineActions(row.composite),
    onAddToPlaylist: () => {
      options.onOpenCompositePlaylistSelector(row.composite.id);
    },
    onAddToQueue: () => {
      if (playableItem) {
        options.onQueuePlayableItemUpNext(playableItem);
      }
    },
    onDelete: () => {
      options.onDeleteFileNode(row);
    },
    onPlayNext: () => {
      if (playableItem) {
        options.onQueuePlayableItemNext(playableItem);
      }
    },
    onRename: () => {
      options.onRenameFileNode(row);
    },
  });
  const moveAction: OptionsMenuAction = {
    disabled: mutationBlocked,
    id: MOVE_ACTION_ID,
    label: MOVE_TO_FOLDER_LABEL,
    onPress: () => {
      options.onMoveFileNode(row);
    },
    tone: 'secondary',
  };
  const insertAt =
    base.findIndex((action) => action.id === AFTER_PLAYLIST_ACTION_ID) + 1;
  const actions = [
    ...base.slice(0, insertAt),
    moveAction,
    ...base.slice(insertAt),
  ].map((action) => ({
    ...action,
    id: `composite:${row.fileLink.id}:${action.id}`,
  }));

  return attachRowActionSections(actions);
};
