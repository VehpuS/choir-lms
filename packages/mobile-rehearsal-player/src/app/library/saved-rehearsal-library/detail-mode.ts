export type SavedRehearsalLibraryDetailMode =
  | 'browse'
  | 'playlist-detail'
  | 'track-loop-detail';

export type SavedRehearsalLibraryView =
  | 'files'
  | 'tracks'
  | 'loops'
  | 'playlists'
  | 'tags';

export type SavedRehearsalLibraryViewOption = {
  label: string;
  value: SavedRehearsalLibraryView;
};

export type SavedRehearsalLibraryVisibleSections = {
  /**
   * Whether the Saved loops heading/status/list render inside the mounted
   * loop section. Kept separate from `showLoopSection` so a view can still
   * mount the loop section (hosting the loop-builder modal for track-row
   * `Make loop`) while hiding its browse list, as the Tracks view does.
   */
  showLoopBrowseList: boolean;
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
    { label: 'Tags', value: 'tags' },
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
  tags: {
    body: 'Browse every tag in use across your saved library, with usage counts, sorting, and search.',
    eyebrow: 'Library',
    title: 'Tags',
  },
  tracks: {
    body: 'Browse saved tracks, with track-linked loops one tap away via View track loops.',
    eyebrow: 'Library',
    title: 'Tracks',
  },
};

const SAVED_REHEARSAL_LIBRARY_VISIBLE_SECTIONS: Record<
  SavedRehearsalLibraryView,
  SavedRehearsalLibraryVisibleSections
> = {
  files: {
    showLoopBrowseList: true,
    showLoopSection: true,
    showPlaylistCards: true,
    showPlaylistSection: true,
    showSourceGroup: true,
  },
  loops: {
    showLoopBrowseList: true,
    showLoopSection: true,
    showPlaylistCards: false,
    showPlaylistSection: false,
    showSourceGroup: false,
  },
  playlists: {
    showLoopBrowseList: false,
    showLoopSection: false,
    showPlaylistCards: true,
    showPlaylistSection: true,
    showSourceGroup: false,
  },
  tags: {
    // Stub for 2.3.1: the Tags view's own list renders separately (task
    // 2.3.2), so none of the shared browse sections mount for this view.
    showLoopBrowseList: false,
    showLoopSection: false,
    showPlaylistCards: false,
    showPlaylistSection: false,
    showSourceGroup: false,
  },
  tracks: {
    // Tracks stays mounted (showLoopSection) so track-row `Make loop` still
    // has the loop-builder modal to render into, but its browse list is
    // hidden: this view shows saved tracks only (task 2.9.5).
    showLoopBrowseList: false,
    showLoopSection: true,
    showPlaylistCards: false,
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
