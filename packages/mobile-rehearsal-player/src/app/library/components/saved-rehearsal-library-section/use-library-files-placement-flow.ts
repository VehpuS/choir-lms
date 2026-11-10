import { useEffect, useState } from 'react';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { LibraryFilesIssue } from '../../saved-rehearsal-library/library-files-operation-helpers';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import {
  planFilesRename,
  type TrackRenameCopiesChoice,
} from '../../saved-rehearsal-library/track-rename-model';
import {
  persistTrackRenameCopiesChoice,
  restoreTrackRenameCopiesChoice,
} from '../../saved-rehearsal-library/track-rename-preference-storage';
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
  // The new name waiting on "rename all copies, or just this one?".
  const [pendingCopiesChoiceName, setPendingCopiesChoiceName] = useState<
    string | null
  >(null);
  const [rememberedCopiesChoice, setRememberedCopiesChoice] =
    useState<TrackRenameCopiesChoice | null>(null);

  useEffect(() => {
    void restoreTrackRenameCopiesChoice().then(setRememberedCopiesChoice);
  }, []);

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

  const runRename = (
    row: LibraryFilesRow,
    nextDraftName: string,
    plan: 'copy-only' | 'track-and-copies',
  ) => {
    clearRenameIssue();
    setPendingCopiesChoiceName(null);
    setIsFileActionMutating(true);

    void (async () => {
      const result =
        plan === 'track-and-copies' && row.kind === 'track'
          ? await files.renameTrack({
              copies: 'all',
              name: nextDraftName,
              parentFolderId: row.fileLink.parentFolderId,
              sourceId: row.source.id,
            })
          : await renameFilesRow({ files, name: nextDraftName, row });

      setIsFileActionMutating(false);

      if (result.didComplete) {
        const nextName = nextDraftName.trim();

        setPendingRenameRow(null);
        setRenameDraftName('');
        setPendingDestinationAction((currentValue) => {
          if (!currentValue || !isSameRow(currentValue.row, row)) {
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
            previousName: row.label,
          }),
        );

        return;
      }

      setRenameIssue(result.issue);
      files.clearIssue();
    })();
  };

  const handleSubmitRename = (suggestedName?: string) => {
    if (!pendingRenameRow) {
      return;
    }

    const nextDraftName = suggestedName ?? renameDraftName;
    const plan = planFilesRename({
      fileLinks: files.fileLinks,
      remembered: rememberedCopiesChoice,
      row: pendingRenameRow,
    });

    if (plan === 'ask') {
      clearRenameIssue();
      setPendingCopiesChoiceName(nextDraftName);
      return;
    }

    runRename(pendingRenameRow, nextDraftName, plan);
  };

  const handleChooseCopies = (
    choice: TrackRenameCopiesChoice,
    remember: boolean,
  ) => {
    if (!pendingRenameRow || pendingCopiesChoiceName === null) {
      return;
    }

    if (remember) {
      setRememberedCopiesChoice(choice);
      void persistTrackRenameCopiesChoice(choice);
    }

    runRename(
      pendingRenameRow,
      pendingCopiesChoiceName,
      choice === 'all' ? 'track-and-copies' : 'copy-only',
    );
  };

  return {
    clearDestinationIssue,
    clearRenameIssue,
    currentDestinationPickerFolderId,
    destinationIssue,
    handleSubmitDestination,
    clearCopiesChoice() {
      setPendingCopiesChoiceName(null);
    },
    handleChooseCopies,
    handleSubmitRename,
    isFileActionMutating,
    pendingCopiesChoiceName,
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
