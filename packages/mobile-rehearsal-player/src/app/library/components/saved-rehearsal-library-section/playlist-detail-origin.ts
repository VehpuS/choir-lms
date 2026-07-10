import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';

export type PlaylistDetailOpenContext = {
  originFilesFolderId?: string | null;
  originView: SavedRehearsalLibraryView;
};

export type PlaylistDetailOrigin = {
  filesFolderId: string | null;
  view: SavedRehearsalLibraryView;
};

export const buildPlaylistDetailOrigin = (
  openContext?: PlaylistDetailOpenContext | null,
): PlaylistDetailOrigin | null => {
  if (!openContext) {
    return null;
  }

  return {
    filesFolderId:
      openContext.originView === 'files'
        ? (openContext.originFilesFolderId ?? null)
        : null,
    view: openContext.originView,
  };
};
