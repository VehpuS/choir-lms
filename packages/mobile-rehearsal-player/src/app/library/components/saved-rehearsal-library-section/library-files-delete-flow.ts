import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { getDeleteFromFolderConfirmationCopy } from './files-row-actions';
import type { LibraryFilesConfirmationDialogContent } from './library-files-confirmation-dialog';
import { formatFolderDeleteImpactMessage } from './library-files-delete-copy';
import {
  createLibraryFilesSuccessFeedback,
  type LibraryFilesSuccessFeedback,
} from './library-files-success-feedback';

type PendingLibraryFilesConfirmation = {
  content: LibraryFilesConfirmationDialogContent;
  onConfirm: () => Promise<void> | void;
};

type RequestLibraryFilesDeleteConfirmationOptions = {
  files: UseLibraryFilesResult;
  onShowSuccessFeedback?: (feedback: LibraryFilesSuccessFeedback) => void;
  requestConfirmation: (confirmation: PendingLibraryFilesConfirmation) => void;
  row: LibraryFilesRow;
};

export const requestLibraryFilesDeleteConfirmation = ({
  files,
  onShowSuccessFeedback,
  requestConfirmation,
  row,
}: RequestLibraryFilesDeleteConfirmationOptions) => {
  if (row.kind === 'folder') {
    const impact = files.getFolderDeleteImpact(row.folder.id);

    if (!impact || impact.isRootFolder) {
      return;
    }

    requestConfirmation({
      content: {
        confirmLabel: 'Delete folder',
        message: formatFolderDeleteImpactMessage(row, impact),
        title: 'Delete folder?',
      },
      onConfirm: async () => {
        const didDelete = await files.deleteFolder(row.folder.id);

        if (didDelete) {
          onShowSuccessFeedback?.(
            createLibraryFilesSuccessFeedback({
              message: `${row.label} was removed from Library Files.`,
              title: 'Folder deleted',
            }),
          );
        }
      },
    });
    return;
  }

  const impact = files.getFileLinkDeleteImpact(row.fileLink);
  const copy = getDeleteFromFolderConfirmationCopy({
    isLastLink: impact.isLastLink,
    itemName: row.label,
  });

  requestConfirmation({
    content: copy,
    onConfirm: async () => {
      const didDelete = await files.deleteFileLink(row.fileLink.id);

      if (didDelete) {
        onShowSuccessFeedback?.(
          createLibraryFilesSuccessFeedback({
            message: `${row.label} was removed from ${files.explorer?.currentFolder.name ?? 'this folder'}.`,
            title: 'Deleted from folder',
          }),
        );
      }
    },
  });
};
