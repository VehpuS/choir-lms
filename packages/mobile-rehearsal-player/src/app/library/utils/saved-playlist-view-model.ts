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
