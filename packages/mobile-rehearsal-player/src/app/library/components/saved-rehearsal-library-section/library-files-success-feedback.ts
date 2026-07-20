import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';

export type LibraryFilesSuccessFeedback = {
  action?: {
    folderId: string;
    label: string;
  };
  id: string;
  message: string;
  title: string;
};

export const createLibraryFilesSuccessFeedback = ({
  action,
  message,
  title,
}: Omit<LibraryFilesSuccessFeedback, 'id'>): LibraryFilesSuccessFeedback => {
  return {
    action,
    id: [title, message, action?.folderId ?? 'none'].join(':'),
    message,
    title,
  };
};

export const createLibraryFilesDestinationSuccessFeedback = (options: {
  destinationFolderName: string;
  kind: 'copy' | 'move';
  row: LibraryFilesRow;
}): LibraryFilesSuccessFeedback => {
  return createLibraryFilesSuccessFeedback({
    message:
      options.kind === 'copy'
        ? `${options.row.label} is now available in ${options.destinationFolderName}.`
        : `${options.row.label} moved to ${options.destinationFolderName}.`,
    title:
      options.kind === 'copy'
        ? 'Copy created'
        : options.row.kind === 'folder'
          ? 'Folder moved'
          : 'Moved to folder',
  });
};

export const createLibraryFilesRenameSuccessFeedback = (options: {
  nextName: string;
  previousName: string;
}): LibraryFilesSuccessFeedback => {
  return createLibraryFilesSuccessFeedback({
    message: `${options.previousName} is now named ${options.nextName}.`,
    title: 'Renamed',
  });
};
