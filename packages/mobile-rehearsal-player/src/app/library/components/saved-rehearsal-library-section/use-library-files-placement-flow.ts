import { useState } from 'react';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { LibraryFilesIssue } from '../../saved-rehearsal-library/library-files-operation-helpers';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import {
  applySuggestedNameToRow,
  isSameRow,
  placeFilesRow,
  renameFilesRow,
} from './files-row-identity';
import type { PendingLibraryFilesDestinationAction } from './library-files-destination-actions';
import {
  createLibraryFilesDestinationSuccessFeedback,
  createLibraryFilesRenameSuccessFeedback,
  type LibraryFilesSuccessFeedback,
} from './library-files-success-feedback';

// The state and submit handlers behind a Files row's `Copy` / `Move` destination
// picker and its rename dialog; the two interlock (a name clash in the picker
// sends the user to rename before retrying).
export const useLibraryFilesPlacementFlow = ({
  files,
  onShowSuccessFeedback,
}: {
  files: UseLibraryFilesResult;
  onShowSuccessFeedback?: (feedback: LibraryFilesSuccessFeedback) => void;
}) => {
  const [isFileActionMutating, setIsFileActionMutating] = useState(false);
  const [pendingDestinationAction, setPendingDestinationAction] =
    useState<PendingLibraryFilesDestinationAction | null>(null);
  const [
    currentDestinationPickerFolderId,
    setCurrentDestinationPickerFolderId,
  ] = useState<string | null>(null);
  const [pendingRenameRow, setPendingRenameRow] =
    useState<LibraryFilesRow | null>(null);
  const [destinationIssue, setDestinationIssue] =
    useState<LibraryFilesIssue | null>(null);
  const [renameDraftName, setRenameDraftName] = useState('');
  const [renameIssue, setRenameIssue] = useState<LibraryFilesIssue | null>(
    null,
  );
  const getFolderName = (folderId: string) => {
    return files.destinationFolders.find((destination) => {
      return destination.folder.id === folderId;
    })?.folder.name;
  };

  const clearDestinationIssue = () => {
    setDestinationIssue(null);
    files.clearIssue();
  };

  const clearRenameIssue = () => {
    setRenameIssue(null);
    files.clearIssue();
  };

  const handleSubmitDestination = (folderId: string, visibleName?: string) => {
    if (!pendingDestinationAction) {
      return;
    }

    clearDestinationIssue();
    setIsFileActionMutating(true);

    void (async () => {
      const row = pendingDestinationAction.row;
      const result = await placeFilesRow({
        action: pendingDestinationAction,
        files,
        folderId,
        visibleName,
      });

      setIsFileActionMutating(false);

      if (result.didComplete) {
        const destinationFolderName =
          getFolderName(folderId) ?? 'the selected folder';

        setPendingDestinationAction(null);
        setCurrentDestinationPickerFolderId(null);
        clearDestinationIssue();
        files.openFolder(folderId);
        onShowSuccessFeedback?.(
          createLibraryFilesDestinationSuccessFeedback({
            destinationFolderName,
            kind: pendingDestinationAction.kind,
            row,
          }),
        );

        return;
      }

      setDestinationIssue(result.issue);
      files.clearIssue();
    })();
  };

  const handleSubmitRename = (suggestedName?: string) => {
    if (!pendingRenameRow) {
      return;
    }

    const nextDraftName = suggestedName ?? renameDraftName;

    clearRenameIssue();
    setIsFileActionMutating(true);

    void (async () => {
      const result = await renameFilesRow({
        files,
        name: nextDraftName,
        row: pendingRenameRow,
      });

      setIsFileActionMutating(false);

      if (result.didComplete) {
        const nextName = nextDraftName.trim();

        setPendingRenameRow(null);
        setRenameDraftName('');
        setPendingDestinationAction((currentValue) => {
          if (!currentValue || !isSameRow(currentValue.row, pendingRenameRow)) {
            return currentValue;
          }

          return {
            ...currentValue,
            row: applySuggestedNameToRow(currentValue.row, nextName),
          };
        });
        clearRenameIssue();
        onShowSuccessFeedback?.(
          createLibraryFilesRenameSuccessFeedback({
            nextName,
            previousName: pendingRenameRow.label,
          }),
        );

        return;
      }

      setRenameIssue(result.issue);
      files.clearIssue();
    })();
  };

  return {
    clearDestinationIssue,
    clearRenameIssue,
    currentDestinationPickerFolderId,
    destinationIssue,
    handleSubmitDestination,
    handleSubmitRename,
    isFileActionMutating,
    pendingDestinationAction,
    pendingRenameRow,
    renameDraftName,
    renameIssue,
    setCurrentDestinationPickerFolderId,
    setPendingDestinationAction,
    setPendingRenameRow,
    setRenameDraftName,
  };
};
