import type { PlayableItem } from '@org/audio-library-models';

// Outside the Library (Recents, Up next, the playback sheet) an item's menu
// offers the same item actions as in the Library (task 8.26). The flows they
// open (playlist picker, tag editor, loop views, removal confirmation) live in
// the Library section, so a menu asks for them over this small channel instead
// of owning copies.
export type SavedItemRequestAction =
  | 'add-to-playlist'
  | 'edit-loop'
  | 'edit-lyrics'
  | 'edit-tags'
  | 'make-loop'
  | 'remove-from-library'
  | 'view-track-loops';

export type SavedItemRequest = {
  action: SavedItemRequestAction;
  /** The loop's id for a loop, the track's source id for a track. */
  id: string;
  kind: 'loop' | 'track';
};

type Listener = (request: SavedItemRequest) => void;

const listeners = new Set<Listener>();

export const ADD_LYRICS_LABEL = 'Lyrics';
export const EDIT_LYRICS_LABEL = 'Edit lyrics';

export const requestSavedItemAction = (request: SavedItemRequest) => {
  listeners.forEach((listener) => {
    listener(request);
  });
};

export const subscribeToSavedItemRequests = (listener: Listener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export type SavedItemShortcut = {
  id: string;
  label: string;
  request: SavedItemRequest;
  tone?: 'destructive';
};

/**
 * The item actions a menu outside the Library offers for a playable item, in
 * the Library menu's order. Nothing is offered while the item's track or loop
 * is not saved, since each of these acts on a saved entity. A loop item is
 * identified by its loop, anything else by its track.
 */
export const resolveSavedItemShortcuts = (options: {
  /** Whether the item's owning track has lyrics: the entry reads `Edit lyrics`. */
  hasLyrics: boolean;
  isSaved: boolean;
  item: Pick<PlayableItem, 'kind' | 'loopId' | 'sourceId'>;
}): SavedItemShortcut[] => {
  const { isSaved, item } = options;

  if (!isSaved) {
    return [];
  }

  const isLoop = item.kind === 'loop' && item.loopId !== undefined;
  const kind = isLoop ? 'loop' : 'track';
  const id = isLoop ? (item.loopId ?? item.sourceId) : item.sourceId;
  const shortcuts: SavedItemShortcut[] = [
    {
      id: 'add-to-playlist',
      label: 'Add to playlist',
      request: { action: 'add-to-playlist', id, kind },
    },
    {
      id: 'edit-tags',
      label: 'Edit tags',
      request: { action: 'edit-tags', id, kind },
    },
    {
      id: 'edit-lyrics',
      label: options.hasLyrics ? EDIT_LYRICS_LABEL : ADD_LYRICS_LABEL,
      request: { action: 'edit-lyrics', id, kind },
    },
  ];

  shortcuts.push(
    isLoop
      ? {
          id: 'edit-loop',
          label: 'Edit loop',
          request: { action: 'edit-loop', id, kind },
        }
      : {
          id: 'make-loop',
          label: 'Make loop',
          request: { action: 'make-loop', id, kind },
        },
  );

  if (!isLoop) {
    shortcuts.push({
      id: 'view-track-loops',
      label: 'View track loops',
      request: { action: 'view-track-loops', id, kind },
    });
  }

  shortcuts.push({
    id: 'remove-from-library',
    label: 'Remove from library',
    request: { action: 'remove-from-library', id, kind },
    tone: 'destructive',
  });

  return shortcuts;
};
