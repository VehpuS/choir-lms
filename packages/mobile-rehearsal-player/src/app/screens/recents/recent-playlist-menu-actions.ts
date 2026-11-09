import type { OptionsMenuAction } from '../../library/components/options-menu-sheet/model';
import { resolveSavedPlaylistMenu } from '../../library/components/saved-item-menu/saved-item-menus';
import { requestSavedItemAction } from '../../library/components/saved-item-menu/saved-item-requests';
import { getRecentsOverflowActionState } from './overflow-actions';

type RecentPlaylistMenuActionOptions = {
  canQueueAsNext: boolean;
  isInLibrary: boolean;
  onClose: () => void;
  onQueuePlaylist: () => void;
  onViewInLibrary: () => void;
  playlistId: string;
};

/**
 * The Library's saved playlist menu (Add items, Edit tags, Remove from library,
 * run by the Library over the request channel) with this surface's own
 * `Queue playlist` and `View in library` as its view actions.
 */
export const getRecentPlaylistMenuActions = (
  options: RecentPlaylistMenuActionOptions,
): OptionsMenuAction[] => {
  const runAndClose = (run: () => void) => () => {
    options.onClose();
    run();
  };
  const viewActions: OptionsMenuAction[] = getRecentsOverflowActionState({
    canQueueAsNext: options.canQueueAsNext,
    isPlaylist: true,
    isViewInLibraryAvailable: options.isInLibrary,
  }).map((action) => ({
    disabled: action.disabled,
    id: `recent-playlist:${action.id}`,
    label: action.label,
    onPress: runAndClose(
      action.id === 'queue-playlist'
        ? options.onQueuePlaylist
        : options.onViewInLibrary,
    ),
    tone: 'secondary',
  }));
  const requestPlaylistAction =
    (action: 'playlist-add-items' | 'playlist-edit-tags' | 'playlist-remove') =>
    () => {
      requestSavedItemAction({
        action,
        id: options.playlistId,
        kind: 'playlist',
      });
    };
  return resolveSavedPlaylistMenu(
    {
      isMutating: false,
      onAddItems: runAndClose(requestPlaylistAction('playlist-add-items')),
      onEditTags: runAndClose(requestPlaylistAction('playlist-edit-tags')),
      onRemoveFromLibrary: runAndClose(
        requestPlaylistAction('playlist-remove'),
      ),
    },
    { idPrefix: 'recent-playlist', viewActions },
  );
};
