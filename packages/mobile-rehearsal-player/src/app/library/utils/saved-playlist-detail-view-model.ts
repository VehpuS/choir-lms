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

export type SavedPlaylistDetailRemoveActionPresentation = {
  isIconOnly: boolean;
  tone: 'neutral' | 'destructive';
};

export type SavedPlaylistDetailItemRemovalCopy = {
  confirmLabel: string;
  message: string;
  title: string;
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

const DRAG_REORDER_STEP_DISTANCE_PX = 52;
const DRAG_REORDER_DOWNWARD_ACTIVATION_DISTANCE_PX = 24;
const DRAG_REORDER_UPWARD_ACTIVATION_DISTANCE_PX = 34;
const EDGE_AUTOSCROLL_ZONE_PX = 96;
const MAX_EDGE_AUTOSCROLL_DELTA_PX = 22;

export const resolveSavedPlaylistDetailDragTargetIndex = (options: {
  deltaY: number;
  fromIndex: number;
  itemCount: number;
}) => {
  const { deltaY, fromIndex, itemCount } = options;

  if (itemCount < 2 || fromIndex < 0 || fromIndex >= itemCount) {
    return fromIndex;
  }

  const activationDistance =
    deltaY < 0
      ? DRAG_REORDER_UPWARD_ACTIVATION_DISTANCE_PX
      : DRAG_REORDER_DOWNWARD_ACTIVATION_DISTANCE_PX;

  if (Math.abs(deltaY) < activationDistance) {
    return fromIndex;
  }

  const normalizedDistance = Math.abs(deltaY) - activationDistance;
  const indexShift =
    1 + Math.floor(normalizedDistance / DRAG_REORDER_STEP_DISTANCE_PX);
  const normalizedShift = Math.sign(deltaY) * indexShift;

  return Math.min(
    Math.max(fromIndex + normalizedShift, 0),
    itemCount - 1,
  );
};

export const resolveSavedPlaylistDetailEdgeAutoscrollDelta = (options: {
  moveY: number;
  viewportHeight: number;
}) => {
  if (options.viewportHeight <= 0) {
    return 0;
  }

  const topEdge = EDGE_AUTOSCROLL_ZONE_PX;
  const bottomEdge = Math.max(
    options.viewportHeight - EDGE_AUTOSCROLL_ZONE_PX,
    topEdge,
  );

  if (options.moveY < topEdge) {
    const proximity = (topEdge - options.moveY) / EDGE_AUTOSCROLL_ZONE_PX;

    return -Math.max(1, Math.round(proximity * MAX_EDGE_AUTOSCROLL_DELTA_PX));
  }

  if (options.moveY > bottomEdge) {
    const proximity =
      (options.moveY - bottomEdge) / EDGE_AUTOSCROLL_ZONE_PX;

    return Math.max(1, Math.round(proximity * MAX_EDGE_AUTOSCROLL_DELTA_PX));
  }

  return 0;
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

export const getSavedPlaylistDetailRemoveActionPresentation = (
  isEditMode: boolean,
): SavedPlaylistDetailRemoveActionPresentation => {
  if (isEditMode) {
    return {
      isIconOnly: false,
      tone: 'destructive',
    };
  }

  return {
    isIconOnly: true,
    tone: 'neutral',
  };
};

export const getSavedPlaylistDetailItemRemovalCopy = (options: {
  entryTitle: string;
  playlistTitle: string;
}): SavedPlaylistDetailItemRemovalCopy => {
  return {
    confirmLabel: 'Remove item',
    message: `"${options.entryTitle}" will be removed from ${options.playlistTitle}. You can undo after removal.`,
    title: 'Remove playlist item?',
  };
};

let pendingPlaylistRenameRequestId: string | null = null;

export const queueSavedPlaylistRenameRequest = (playlistId: string) => {
  pendingPlaylistRenameRequestId = playlistId;
};

export const consumeSavedPlaylistRenameRequest = (playlistId: string) => {
  if (pendingPlaylistRenameRequestId !== playlistId) {
    return false;
  }

  pendingPlaylistRenameRequestId = null;

  return true;
};
