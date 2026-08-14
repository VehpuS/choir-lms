import {
  createPlaylist,
  type NamedLoop,
  type Playlist,
} from '@org/audio-library-models';

import type { OptionsMenuAction } from '../../components/options-menu-sheet/model';
import {
  formatDurationLabel,
  type DriveLibrarySource,
} from '../../drive/utils/drive-library-view-model';
import {
  getPlaylistPlaybackSessionSummary,
  type PlaylistPlaybackSession,
} from './saved-playlist-playback-view-model';

export type SavedPlaylistIssue = {
  kind: 'delete' | 'save' | 'storage';
  message: string;
  playlistId?: string;
  title: string;
};

export type PlaylistDraftIssue = {
  title: string;
  message: string;
};

export type SavedPlaylistRemovalCopy = {
  confirmLabel: string;
  message: string;
  title: string;
};

export type SavedPlaylistDetailSummary = {
  body: string | null;
  metadataLabel: string;
  title: string;
};

export type SavedPlaylistCreateDialogCopy = {
  body: string;
  cancelLabel: string;
  placeholder: string;
  savingLabel: string;
  submitLabel: string;
  title: string;
};

const PLAYLIST_NAME_REQUIRED_ISSUE: PlaylistDraftIssue = {
  title: 'Playlist name required',
  message: 'Enter a playlist name.',
};

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const getOwnershipLabel = (ownershipScope: Playlist['ownershipScope']) => {
  if (ownershipScope === 'choir') {
    return 'Choir';
  }

  if (ownershipScope === 'section') {
    return 'Section';
  }

  return 'Personal';
};

const getPlaylistEntryDurationMs = (options: {
  entry: Playlist['items'][number];
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
}) => {
  if (options.entry.kind === 'loop') {
    const loop = options.savedLoops.find((savedLoop) => {
      return savedLoop.id === options.entry.loopId;
    });

    return loop ? Math.max(0, loop.endMs - loop.startMs) : undefined;
  }

  return options.savedSources.find((source) => {
    return source.id === options.entry.sourceId;
  })?.durationMs;
};

const getPlaylistDurationLabel = (options: {
  playlist: Playlist;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
}) => {
  const totalDurationMs = options.playlist.items.reduce(
    (totalDuration, entry) => {
      return (
        totalDuration +
        (getPlaylistEntryDurationMs({
          entry,
          savedLoops: options.savedLoops,
          savedSources: options.savedSources,
        }) ?? 0)
      );
    },
    0,
  );

  return totalDurationMs > 0 ? formatDurationLabel(totalDurationMs) : undefined;
};

const getLoopEntryRangeLabel = (loop: NamedLoop) => {
  const startLabel = formatDurationLabel(loop.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(loop.endMs) ?? '0:00';

  return `Loop ${startLabel} - ${endLabel} • ${loop.sourceName}`;
};

export const validatePlaylistName = (name: string) => {
  return name.trim() ? null : PLAYLIST_NAME_REQUIRED_ISSUE;
};

export const buildSavedPlaylist = (options: {
  createId?: (ownerId: string, createdAt: string) => string;
  name: string;
  now?: string;
  ownerId: string;
}) => {
  const issue = validatePlaylistName(options.name);

  if (issue) {
    return {
      issue,
      playlist: null,
    };
  }

  return {
    issue: null,
    playlist: createPlaylist({
      createId: options.createId,
      createdAt: options.now,
      name: options.name,
      ownerId: options.ownerId,
    }),
  };
};

export const resolveSelectedPlaylist = (
  playlists: Playlist[],
  selectedPlaylistId: string | null,
) => {
  if (!selectedPlaylistId) {
    return playlists[0] ?? null;
  }

  return (
    playlists.find((playlist) => {
      return playlist.id === selectedPlaylistId;
    }) ??
    playlists[0] ??
    null
  );
};

export const getSavedPlaylistDetailSummary = (options: {
  activeSession: PlaylistPlaybackSession | null;
  playlist: Playlist;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
}): SavedPlaylistDetailSummary => {
  const durationLabel = getPlaylistDurationLabel({
    playlist: options.playlist,
    savedLoops: options.savedLoops,
    savedSources: options.savedSources,
  });
  const metadataParts = [
    pluralize(options.playlist.items.length, 'item'),
    durationLabel ? `${durationLabel} total` : null,
    getOwnershipLabel(options.playlist.ownershipScope),
  ].filter((part): part is string => Boolean(part));

  return {
    title: options.playlist.name,
    metadataLabel: metadataParts.join(' • '),
    body: options.activeSession
      ? getPlaylistPlaybackSessionSummary(options.activeSession)
      : null,
  };
};

export const getSavedPlaylistEntryDetailLabel = (options: {
  entry: Playlist['items'][number];
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
}) => {
  if (options.entry.kind === 'loop') {
    const loop = options.savedLoops.find((savedLoop) => {
      return savedLoop.id === options.entry.loopId;
    });

    if (loop) {
      return getLoopEntryRangeLabel(loop);
    }

    return options.entry.description ?? 'Saved loop';
  }

  const durationLabel = getPlaylistEntryDurationMs(options);

  return durationLabel
    ? `Full track • ${formatDurationLabel(durationLabel)}`
    : (options.entry.description ?? 'Saved track');
};

export const getSavedPlaylistRemovalCopy = (
  playlist: Pick<Playlist, 'items' | 'name'>,
): SavedPlaylistRemovalCopy => {
  if (playlist.items.length === 0) {
    return {
      confirmLabel: 'Remove playlist',
      message: `"${playlist.name}" will be removed from your saved playlists.`,
      title: 'Remove saved playlist?',
    };
  }

  return {
    confirmLabel: 'Remove playlist',
    message:
      `"${playlist.name}" will be removed from your saved playlists.\n\n` +
      `This will remove ${pluralize(playlist.items.length, 'item')} from this playlist only. Saved tracks and loops will stay in Library.`,
    title: 'Remove saved playlist?',
  };
};

export const getSavedPlaylistCreateDialogCopy = (options?: {
  destinationFolderName?: string | null;
}): SavedPlaylistCreateDialogCopy => {
  const destinationFolderName = options?.destinationFolderName;

  return {
    body: 'Create a new playlist from saved rehearsal material.',
    cancelLabel: 'Cancel',
    placeholder: 'Wednesday rehearsal',
    savingLabel: 'Creating…',
    submitLabel: 'Create playlist',
    title: destinationFolderName
      ? `Create a playlist in ${destinationFolderName}`
      : 'Create playlist',
  };
};

export const getPlaylistOptionsMenuActions = (options: {
  isMutating: boolean;
  onAddItems?: () => void;
  onEditTags?: () => void;
  onRemove?: () => void;
  onRename: () => void;
}): OptionsMenuAction[] => {
  const actions: OptionsMenuAction[] = [];

  if (options.onAddItems) {
    actions.push({
      disabled: options.isMutating,
      id: 'add-playlist-items',
      label: 'Add items',
      onPress: options.onAddItems,
      tone: 'secondary',
    });
  }

  actions.push({
    disabled: options.isMutating,
    id: 'rename-playlist',
    label: 'Rename playlist',
    onPress: options.onRename,
    tone: 'primary',
  });

  if (options.onEditTags) {
    actions.push({
      disabled: options.isMutating,
      id: 'edit-playlist-tags',
      label: 'Edit tags',
      onPress: options.onEditTags,
      tone: 'secondary',
    });
  }

  if (options.onRemove) {
    actions.push({
      disabled: options.isMutating,
      id: 'remove-playlist',
      label: 'Remove playlist',
      onPress: options.onRemove,
      tone: 'destructive',
    });
  }

  return actions;
};
