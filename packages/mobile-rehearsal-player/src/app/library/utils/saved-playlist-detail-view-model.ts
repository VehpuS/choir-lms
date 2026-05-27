import {
  isSourcePlayable,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import type { DriveLibrarySource } from './drive-library-view-model';

type PlaylistEntry = Playlist['items'][number];

export type SavedPlaylistDetailRemovalNotice = {
  entry: PlaylistEntry;
  previousIndex: number;
};

export type SavedPlaylistDetailState = {
  draftEntries: PlaylistEntry[];
  isEditing: boolean;
  removalNotice: SavedPlaylistDetailRemovalNotice | null;
};

export type SavedPlaylistDetailAction =
  | {
      type: 'clear-removal-notice';
    }
  | {
      type: 'enter-edit-mode';
      entries: PlaylistEntry[];
    }
  | {
      type: 'exit-edit-mode';
    }
  | {
      type: 'reset';
      entries?: PlaylistEntry[];
    }
  | {
      type: 'show-removal-notice';
      removalNotice: SavedPlaylistDetailRemovalNotice;
    }
  | {
      type: 'update-draft-entries';
      entries: PlaylistEntry[];
    };

const moveItem = <Entity>(
  values: Entity[],
  fromIndex: number,
  toIndex: number,
) => {
  if (
    fromIndex < 0 ||
    fromIndex >= values.length ||
    toIndex < 0 ||
    toIndex >= values.length ||
    fromIndex === toIndex
  ) {
    return values;
  }

  const nextValues = [...values];
  const [movedValue] = nextValues.splice(fromIndex, 1);

  nextValues.splice(toIndex, 0, movedValue);

  return nextValues;
};

const insertItem = <Entity>(
  values: Entity[],
  value: Entity,
  targetIndex: number,
) => {
  const nextValues = [...values];
  const normalizedIndex = Math.min(Math.max(targetIndex, 0), nextValues.length);

  nextValues.splice(normalizedIndex, 0, value);

  return nextValues;
};

export const getSavedPlaylistDetailInitialState =
  (): SavedPlaylistDetailState => {
    return {
      draftEntries: [],
      isEditing: false,
      removalNotice: null,
    };
  };

export const reduceSavedPlaylistDetailState = (
  state: SavedPlaylistDetailState,
  action: SavedPlaylistDetailAction,
): SavedPlaylistDetailState => {
  switch (action.type) {
    case 'clear-removal-notice': {
      return {
        ...state,
        removalNotice: null,
      };
    }

    case 'enter-edit-mode': {
      return {
        draftEntries: [...action.entries],
        isEditing: true,
        removalNotice: null,
      };
    }

    case 'exit-edit-mode': {
      return {
        ...state,
        draftEntries: [],
        isEditing: false,
      };
    }

    case 'reset': {
      return {
        draftEntries: [...(action.entries ?? [])],
        isEditing: false,
        removalNotice: null,
      };
    }

    case 'show-removal-notice': {
      return {
        ...state,
        removalNotice: action.removalNotice,
      };
    }

    case 'update-draft-entries': {
      return {
        ...state,
        draftEntries: [...action.entries],
      };
    }
  }
};

export const buildSavedPlaylistDetailDraftPlaylist = (
  playlist: Playlist,
  draftEntries: PlaylistEntry[],
  updatedAt: string = new Date().toISOString(),
): Playlist => {
  return {
    ...playlist,
    items: draftEntries.map((entry, sortIndex) => ({
      ...entry,
      playlistId: playlist.id,
      sortIndex,
    })),
    updatedAt,
  };
};

export const moveSavedPlaylistDetailEntry = (
  entries: PlaylistEntry[],
  fromIndex: number,
  toIndex: number,
) => {
  return moveItem(entries, fromIndex, toIndex);
};

export const removeSavedPlaylistDetailEntry = (
  entries: PlaylistEntry[],
  entryId: string,
) => {
  const previousIndex = entries.findIndex((entry) => {
    return entry.id === entryId;
  });

  if (previousIndex < 0) {
    return null;
  }

  return {
    entry: entries[previousIndex],
    nextEntries: entries.filter((entry) => {
      return entry.id !== entryId;
    }),
    previousIndex,
  };
};

export const restoreSavedPlaylistDetailEntry = (
  entries: PlaylistEntry[],
  removalNotice: SavedPlaylistDetailRemovalNotice,
) => {
  return insertItem(entries, removalNotice.entry, removalNotice.previousIndex);
};

export const isSavedPlaylistEntryPlayable = (options: {
  entry: PlaylistEntry;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
}) => {
  const source = options.savedSources.find((savedSource) => {
    return savedSource.id === options.entry.sourceId;
  });

  if (!source || !isSourcePlayable(source)) {
    return false;
  }

  if (options.entry.kind === 'track') {
    return true;
  }

  return options.savedLoops.some((savedLoop) => {
    return savedLoop.id === options.entry.loopId;
  });
};
