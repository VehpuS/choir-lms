import type { SavedRehearsalLibraryView } from '../../saved-rehearsal-library/detail-mode';

export type PlaylistDetailOpenContext = {
  originFilesFolderId?: string | null;
  originFilesFolderName?: string | null;
  originView: SavedRehearsalLibraryView;
};

export type PlaylistDetailOrigin = {
  filesFolderId: string | null;
  filesFolderName: string | null;
  view: SavedRehearsalLibraryView;
};

export type PlaylistDetailEmptyStateCopy = {
  actionLabel: string | null;
  message: string;
};

const DEFAULT_EMPTY_PLAYLIST_MESSAGE =
  'This playlist is empty. Return to Library, add saved tracks or loops there, then come back here to review the running order.';
const FILES_EMPTY_PLAYLIST_ACTION_LABEL = 'Add items';
const FILES_EMPTY_PLAYLIST_FALLBACK_FOLDER_LABEL = 'this Files folder';

const getFilesFolderLabel = (origin: PlaylistDetailOrigin) => {
  const folderName = origin.filesFolderName?.trim();

  return folderName || FILES_EMPTY_PLAYLIST_FALLBACK_FOLDER_LABEL;
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
    filesFolderName:
      openContext.originView === 'files'
        ? (openContext.originFilesFolderName ?? null)
        : null,
    view: openContext.originView,
  };
};

export const getPlaylistDetailEmptyStateCopy = (
  origin: PlaylistDetailOrigin | null,
): PlaylistDetailEmptyStateCopy => {
  if (origin?.view !== 'files') {
    return {
      actionLabel: null,
      message: DEFAULT_EMPTY_PLAYLIST_MESSAGE,
    };
  }

  return {
    actionLabel: FILES_EMPTY_PLAYLIST_ACTION_LABEL,
    message:
      `This playlist is empty. Add tracks or loops from ${getFilesFolderLabel(origin)}, ` +
      'then come back here to review the running order.',
  };
};
