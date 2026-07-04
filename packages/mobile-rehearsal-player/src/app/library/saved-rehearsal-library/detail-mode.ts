export type SavedRehearsalLibraryDetailMode =
  | 'browse'
  | 'playlist-detail'
  | 'track-loop-detail';

export type SavedRehearsalLibraryView =
  | 'files'
  | 'tracks'
  | 'loops'
  | 'playlists';

export type SavedRehearsalLibraryViewOption = {
  label: string;
  value: SavedRehearsalLibraryView;
};

export type SavedRehearsalLibraryVisibleSections = {
  showLoopSection: boolean;
  showPlaylistCards: boolean;
  showPlaylistSection: boolean;
  showSourceGroup: boolean;
};

type SavedRehearsalLibraryViewCopy = {
  body: string;
  eyebrow: string;
  title: string;
};

export const SAVED_REHEARSAL_LIBRARY_VIEW_OPTIONS: readonly SavedRehearsalLibraryViewOption[] =
  [
    { label: 'Files', value: 'files' },
    { label: 'Tracks', value: 'tracks' },
    { label: 'Loops', value: 'loops' },
    { label: 'Playlists', value: 'playlists' },
  ];

const SAVED_REHEARSAL_LIBRARY_VIEW_COPY: Record<
  SavedRehearsalLibraryView,
  SavedRehearsalLibraryViewCopy
> = {
  files: {
    body: 'Manage saved items and folders across tracks, loops, and playlists.',
    eyebrow: 'Library',
    title: 'Files',
  },
  loops: {
    body: 'Jump straight into saved practice segments and loop playback.',
    eyebrow: 'Library',
    title: 'Loops',
  },
  playlists: {
    body: 'Open, create, and manage saved rehearsal playlists in one place.',
    eyebrow: 'Library',
    title: 'Playlists',
  },
  tracks: {
    body: 'Browse saved tracks with quick playlist access and track-linked loops.',
    eyebrow: 'Library',
    title: 'Tracks',
  },
};

const SAVED_REHEARSAL_LIBRARY_VISIBLE_SECTIONS: Record<
  SavedRehearsalLibraryView,
  SavedRehearsalLibraryVisibleSections
> = {
  files: {
    showLoopSection: true,
    showPlaylistCards: true,
    showPlaylistSection: true,
    showSourceGroup: true,
  },
  loops: {
    showLoopSection: true,
    showPlaylistCards: false,
    showPlaylistSection: false,
    showSourceGroup: false,
  },
  playlists: {
    showLoopSection: false,
    showPlaylistCards: true,
    showPlaylistSection: true,
    showSourceGroup: false,
  },
  tracks: {
    showLoopSection: true,
    showPlaylistCards: true,
    showPlaylistSection: false,
    showSourceGroup: true,
  },
};

export const resolveSavedRehearsalLibraryDetailMode = (options: {
  isPlaylistDetailVisible: boolean;
  selectedLoopViewSourceId: string | null;
}): SavedRehearsalLibraryDetailMode => {
  if (options.isPlaylistDetailVisible) {
    return 'playlist-detail';
  }

  if (options.selectedLoopViewSourceId !== null) {
    return 'track-loop-detail';
  }

  return 'browse';
};

export const resolveSavedRehearsalLibraryViewCopy = (
  view: SavedRehearsalLibraryView,
): SavedRehearsalLibraryViewCopy => {
  return SAVED_REHEARSAL_LIBRARY_VIEW_COPY[view];
};

export const resolveSavedRehearsalLibraryVisibleSections = (
  view: SavedRehearsalLibraryView,
): SavedRehearsalLibraryVisibleSections => {
  return SAVED_REHEARSAL_LIBRARY_VISIBLE_SECTIONS[view];
};
