import { MAX_COMPOSITE_RECORD_NAME_LENGTH } from '@org/audio-library-models';

import type { LibraryFilesConfirmationDialogContent } from '../../selection/library-files-confirmation-dialog';
import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import {
  requestSavedItemAction,
  SHEET_MUSIC_LABEL,
} from '../../components/saved-item-menu/saved-item-requests';
import {
  createLyricsMenuState,
  resolveLyricsMenuActions,
} from '../../lyrics/utils/lyrics-menu-action';

/**
 * What a composite row's menu offers and says (composite-tracks 7.1): play and
 * queue like any item, rename, and delete, which keeps the stems as tracks.
 * `Keep all stems offline` (7.3) sits before rename. Pure; the view and the
 * store sit around it.
 */

export const ADD_TO_PLAYLIST_LABEL = 'Add to playlist';
export const PLAYLISTS_UNAVAILABLE_LABEL = 'Playlists unavailable';
export const RENAME_LABEL = 'Rename';
export const DELETE_LABEL = 'Delete composite';
export const RENAME_TITLE = 'Rename composite';
export const RENAME_FIELD_LABEL = 'Composite name';
export const MAX_COMPOSITE_NAME_LENGTH = MAX_COMPOSITE_RECORD_NAME_LENGTH;

/**
 * `Lyrics` and `Sheet music` for a composite, the same two the playback menu
 * offers (composite-tracks 12.20): the requests carry the composite's id, and
 * the lyrics and sheet music hosts resolve its stems.
 */
export const resolveCompositeContentActions = (options: {
  compositeId: string;
  hasLyrics: boolean;
}): OptionsMenuAction[] => [
  ...resolveLyricsMenuActions(
    createLyricsMenuState({
      hasLyrics: options.hasLyrics,
      id: options.compositeId,
      kind: 'track',
    }),
    'composite',
  ),
  {
    id: 'composite:sheet-music',
    label: SHEET_MUSIC_LABEL,
    onPress: () => {
      requestSavedItemAction({
        action: 'composite-sheet-music',
        id: options.compositeId,
        kind: 'track',
      });
    },
    tone: 'secondary',
  },
];

export const resolveCompositeRowMenu = (options: {
  isPlayable: boolean;
  /** Something is already playing, so there is a queue to add to. */
  canQueueAsNext: boolean;
  /** Playlists can be changed now (they are loaded and not mid-save). */
  canAddToPlaylist: boolean;
  /** `Lyrics` and `Sheet music` (`resolveCompositeContentActions`). */
  contentActions?: OptionsMenuAction[];
  /** The offline rows (`composite-offline.ts`); none where unsupported. */
  offlineActions?: OptionsMenuAction[];
  onAddToPlaylist: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onRename: () => void;
  onDelete: () => void;
}): OptionsMenuAction[] => {
  const queueActions: OptionsMenuAction[] =
    options.canQueueAsNext && options.isPlayable
      ? [
          { id: 'play-next', label: 'Play next', onPress: options.onPlayNext },
          {
            id: 'add-to-queue',
            label: 'Add to queue',
            onPress: options.onAddToQueue,
          },
        ]
      : [];

  return [
    ...queueActions,
    {
      id: 'add-to-playlist',
      label: options.canAddToPlaylist
        ? ADD_TO_PLAYLIST_LABEL
        : PLAYLISTS_UNAVAILABLE_LABEL,
      disabled: !options.canAddToPlaylist,
      onPress: options.onAddToPlaylist,
    },
    ...(options.contentActions ?? []),
    ...(options.offlineActions ?? []),
    { id: 'rename', label: RENAME_LABEL, onPress: options.onRename },
    {
      id: 'delete',
      label: DELETE_LABEL,
      icon: 'trash-can-outline',
      onPress: options.onDelete,
      tone: 'destructive',
    },
  ];
};

/** The delete question: it names the composite and says the stems stay. */
export const buildDeleteCompositeDialog = (composite: {
  name: string;
  stemCount: number;
}): LibraryFilesConfirmationDialogContent => ({
  title: DELETE_LABEL,
  message: `“${composite.name}” will be deleted, with its saved mixes and prepared audio. Its ${composite.stemCount} stems stay in your library as tracks.`,
  confirmLabel: DELETE_LABEL,
});

export type RenameModel = {
  /** What would be saved: the typed text, trimmed. */
  name: string;
  canSave: boolean;
};

/** Saving needs a name that is not blank and not the one it already has. */
export const resolveRenameModel = (
  typed: string,
  currentName: string,
): RenameModel => {
  const name = typed.trim();

  return {
    name,
    canSave:
      name.length > 0 &&
      name.length <= MAX_COMPOSITE_NAME_LENGTH &&
      name !== currentName,
  };
};
