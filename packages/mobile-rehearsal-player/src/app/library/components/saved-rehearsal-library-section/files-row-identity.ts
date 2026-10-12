import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import type { PendingLibraryFilesDestinationAction } from './library-files-destination-actions';

// Whether two Files rows are the same folder or file link.
export const isSameRow = (left: LibraryFilesRow, right: LibraryFilesRow) => {
  if (left.kind !== right.kind) {
    return false;
  }

  if (left.kind === 'folder' && right.kind === 'folder') {
    return left.folder.id === right.folder.id;
  }

  if (left.kind !== 'folder' && right.kind !== 'folder') {
    return left.fileLink.id === right.fileLink.id;
  }

  return false;
};

// The row as it reads after a rename, before the tree has reloaded.
export const applySuggestedNameToRow = (
  row: LibraryFilesRow,
  nextName: string,
) => {
  if (row.kind === 'folder') {
    return {
      ...row,
      folder: {
        ...row.folder,
        name: nextName,
      },
      label: nextName,
    };
  }

  return {
    ...row,
    fileLink: {
      ...row.fileLink,
      visibleName: nextName,
    },
    label: nextName,
  };
};

// The track a menu action names, when it is this row's own track.
export const getTrackRowSource = (
  row: LibraryFilesRow,
  sourceId: string,
): DriveLibrarySource | null => {
  return row.kind === 'track' && row.source.id === sourceId ? row.source : null;
};

// The track behind a track row or a loop row, for opening the loop editor.
export const getRowSource = (
  row: LibraryFilesRow,
  sourceId: string,
): DriveLibrarySource | null => {
  if (row.kind === 'loop') {
    return row.source?.id === sourceId ? row.source : null;
  }

  return getTrackRowSource(row, sourceId);
};

// Copies the row (files only) or moves it, folder or file, to a destination.
export const placeFilesRow = (options: {
  action: PendingLibraryFilesDestinationAction;
  files: UseLibraryFilesResult;
  folderId: string;
  visibleName?: string;
}) => {
  const { action, files, folderId, visibleName } = options;
  const { row } = action;

  if (action.kind === 'copy' && row.kind !== 'folder') {
    return files.createFileLinkCopy({
      destinationFolderId: folderId,
      fileLink: row.fileLink,
      sourceName: row.label,
      visibleName,
    });
  }

  return row.kind === 'folder'
    ? files.moveFolder({ destinationFolderId: folderId, folder: row.folder })
    : files.moveFileLink({
        destinationFolderId: folderId,
        fileLink: row.fileLink,
      });
};

// Renames a folder or a file link in place.
export const renameFilesRow = (options: {
  files: UseLibraryFilesResult;
  name: string;
  row: LibraryFilesRow;
}) => {
  const { files, name, row } = options;

  return row.kind === 'folder'
    ? files.renameFolder({ folder: row.folder, name })
    : files.renameFileLink({ fileLink: row.fileLink, name });
};
