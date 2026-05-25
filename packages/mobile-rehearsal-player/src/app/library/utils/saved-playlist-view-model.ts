import { createPlaylist, type Playlist } from '@org/audio-library-models';

import type { DriveLibraryStatusCopy } from './drive-library-view-model';

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

export type SavedPlaylistLibraryActionCopy = {
  disabled: boolean;
  label: string;
};

export type SavedPlaylistRemovalCopy = {
  confirmLabel: string;
  message: string;
  title: string;
};

export type SavedPlaylistSelectionCopy = DriveLibraryStatusCopy;

export type SavedPlaylistCard = {
  detailLabel: string;
  playlist: Playlist;
  previewLabel: string;
};

const PLAYLIST_NAME_REQUIRED_ISSUE: PlaylistDraftIssue = {
  title: 'Playlist name required',
  message: 'Provide a playlist name before saving this rehearsal set.',
};

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
};

const getPlaylistDetailLabel = (playlist: Playlist) => {
  const trackCount = playlist.items.filter((entry) => {
    return entry.kind === 'track';
  }).length;
  const loopCount = playlist.items.length - trackCount;

  return [
    pluralize(playlist.items.length, 'item'),
    pluralize(trackCount, 'track'),
    pluralize(loopCount, 'loop'),
  ].join(' • ');
};

const getPlaylistPreviewLabel = (playlist: Playlist) => {
  if (playlist.items.length === 0) {
    return 'No playlist items yet. Add saved tracks or loops below.';
  }

  return playlist.items
    .slice(0, 3)
    .map((entry) => entry.title)
    .join(' • ');
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

export const getSavedPlaylistLibraryActionCopy = (options: {
  canMutatePlaylists: boolean;
  isMutating: boolean;
  selectedPlaylist: Playlist | null;
}): SavedPlaylistLibraryActionCopy => {
  if (!options.canMutatePlaylists) {
    return {
      disabled: true,
      label: 'Playlists unavailable',
    };
  }

  if (options.isMutating) {
    return {
      disabled: true,
      label: 'Updating playlist…',
    };
  }

  if (!options.selectedPlaylist) {
    return {
      disabled: true,
      label: 'Select playlist',
    };
  }

  return {
    disabled: false,
    label: `Add to ${options.selectedPlaylist.name}`,
  };
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

export const getSavedPlaylistSelectionCopy = (options: {
  savedPlaylistCount: number;
  selectedPlaylist: Playlist | null;
}): SavedPlaylistSelectionCopy | null => {
  if (options.savedPlaylistCount === 0) {
    return null;
  }

  if (!options.selectedPlaylist) {
    return {
      title: 'Choose a playlist destination',
      message:
        'Select a playlist below before adding saved tracks or loops from Library.',
      tone: 'neutral',
    };
  }

  if (options.savedPlaylistCount === 1) {
    return {
      title: `Adding to ${options.selectedPlaylist.name}`,
      message:
        'Saved track and loop actions add directly into this playlist while you build the running order.',
      tone: 'ready',
    };
  }

  return {
    title: `Adding to ${options.selectedPlaylist.name}`,
    message:
      'Choose a different playlist below any time you want Library actions to add into another rehearsal set.',
    tone: 'ready',
  };
};

export const resolveSavedPlaylistCards = (
  playlists: Playlist[],
): SavedPlaylistCard[] => {
  return playlists.map((playlist) => {
    return {
      detailLabel: getPlaylistDetailLabel(playlist),
      playlist,
      previewLabel: getPlaylistPreviewLabel(playlist),
    };
  });
};

export const getSelectedPlaylistIssue = (
  issue: SavedPlaylistIssue | null,
  selectedPlaylistId: string | null,
): PlaylistDraftIssue | null => {
  if (!issue?.playlistId || !selectedPlaylistId) {
    return null;
  }

  if (issue.playlistId !== selectedPlaylistId) {
    return null;
  }

  return {
    title: issue.title,
    message: issue.message,
  };
};

export const getSavedPlaylistsStatusCopy = (options: {
  isLoading: boolean;
  issue: SavedPlaylistIssue | null;
  savedPlaylistCount: number;
}): DriveLibraryStatusCopy => {
  if (options.issue) {
    return {
      title: options.issue.title,
      message: options.issue.message,
      tone: 'error',
    };
  }

  if (options.isLoading && options.savedPlaylistCount === 0) {
    return {
      title: 'Loading saved playlists',
      message: 'Reading saved rehearsal playlists stored on this device.',
      tone: 'neutral',
    };
  }

  if (options.savedPlaylistCount === 0) {
    return {
      title: 'No playlists yet',
      message:
        'Create a playlist, then add saved tracks and loops to shape a repeatable rehearsal set.',
      tone: 'neutral',
    };
  }

  return {
    title: 'Saved playlists ready',
    message: `${pluralize(options.savedPlaylistCount, 'playlist')} ready for saved tracks and loops.`,
    tone: 'ready',
  };
};
