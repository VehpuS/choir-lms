import type { DriveLibraryStatusCopy } from './drive-library-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistIssue,
} from './saved-playlist-view-model';

const pluralize = (count: number, noun: string) => {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
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
