import { resolveSavedPlaylistMenu } from '../../components/saved-item-menu/saved-item-menus';
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
import { formatSavedLoopTimeRange } from '../../loops/utils/saved-loop-view-model';
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

// `Loop • 0:12–0:18 • <parent>`: the range is its own segment so the row meta
// line sets it in the mono font.
const getLoopEntryRangeLabel = (loop: NamedLoop) => {
  return `Loop • ${formatSavedLoopTimeRange(loop)} • ${loop.sourceName}`;
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

  return {
    title: options.playlist.name,
    metadataLabel: durationLabel ? `${durationLabel} total` : '',
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

/**
 * A playlist's menu outside Files: the shared saved-playlist menu (task 2.12)
 * plus `Rename playlist`, this view's own action, since here the row is the
 * playlist itself rather than a file link.
 */
export const getPlaylistOptionsMenuActions = (options: {
  isMutating: boolean;
  onAddItems?: () => void;
  onEditTags: () => void;
  onRemove: () => void;
  onRename: () => void;
}): OptionsMenuAction[] => {
  return resolveSavedPlaylistMenu(
    {
      isMutating: options.isMutating,
      onAddItems: options.onAddItems,
      onEditTags: options.onEditTags,
      onRemoveFromLibrary: options.onRemove,
    },
    {
      idPrefix: 'playlist',
      viewActions: [
        {
          disabled: options.isMutating,
          id: 'playlist:rename',
          label: 'Rename playlist',
          onPress: options.onRename,
          // Not `primary`: the sheet hoists primary actions to the top,
          // which would break the shared item order.
          tone: 'secondary',
        },
      ],
    },
  );
};
