import type {
  RehearsalLibraryFileLinkNode,
  RehearsalLibraryFileTree,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import type { AsyncStoragePracticeRepository } from '@org/audio-library-runtime';
import type { Dispatch, SetStateAction } from 'react';

import { LOCAL_REHEARSAL_LIBRARY_OWNER_ID } from '../storage/local-library-storage';
import {
  formatLibraryFilesIssue,
  type LibraryFilesIssue,
} from './library-files-operation-helpers';

type LibraryFilesRenameOperationsOptions = {
  practiceRepository: AsyncStoragePracticeRepository;
  setIssue: Dispatch<SetStateAction<LibraryFilesIssue | null>>;
  setTree: Dispatch<SetStateAction<RehearsalLibraryFileTree | null>>;
};

export const createLibraryFilesRenameOperations = ({
  practiceRepository,
  setIssue,
  setTree,
}: LibraryFilesRenameOperationsOptions) => {
  return {
    async renameFileLink(optionsForRename: {
      fileLink: RehearsalLibraryFileLinkNode;
      name: string;
    }) {
      const trimmedName = optionsForRename.name.trim();

      if (!trimmedName) {
        setIssue({
          message: 'Enter a file name.',
          title: 'File name required',
        });
        return false;
      }

      try {
        const nextTree = await practiceRepository.saveLibraryFileLink(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            ...optionsForRename.fileLink,
            visibleName: trimmedName,
          },
        );

        setTree(nextTree);
        setIssue(null);
        return true;
      } catch (error) {
        setIssue(
          formatLibraryFilesIssue(
            'Could not rename item',
            `The Library Files item could not be renamed to "${trimmedName}".`,
            error,
          ),
        );
        return false;
      }
    },
    async renameFolder(optionsForRename: {
      folder: RehearsalLibraryFolderNode;
      name: string;
    }) {
      const trimmedName = optionsForRename.name.trim();

      if (!trimmedName) {
        setIssue({
          message: 'Enter a folder name.',
          title: 'Folder name required',
        });
        return false;
      }

      try {
        const nextTree = await practiceRepository.saveLibraryFolderNode(
          LOCAL_REHEARSAL_LIBRARY_OWNER_ID,
          {
            ...optionsForRename.folder,
            name: trimmedName,
          },
        );

        setTree(nextTree);
        setIssue(null);
        return true;
      } catch (error) {
        setIssue(
          formatLibraryFilesIssue(
            'Could not rename folder',
            `The Library Files folder could not be renamed to "${trimmedName}".`,
            error,
          ),
        );
        return false;
      }
    },
  };
};
