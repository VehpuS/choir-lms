import { useState } from 'react';

import type {
  PlayableItem,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { LibraryFilesIssue } from '../../saved-rehearsal-library/library-files-operation-helpers';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { FeedbackCard } from '../feedback-card';
import { OptionsMenuSheet } from '../options-menu-sheet';
import { resolveFilesRowMenuActions } from './files-row-actions';
import type { FileLinkLibraryFilesRow } from './files-row-actions-model';
import {
  formatTrackRemoveFromLibraryImpactMessage,
  getTrackRemoveFromLibraryAffectedSections,
} from './library-files-delete-copy';
import { requestLibraryFilesDeleteConfirmation } from './library-files-delete-flow';
import {
  buildLibraryFilesDestinationPicker,
  type PendingLibraryFilesDestinationAction,
} from './library-files-destination-actions';
import { LibraryFilesRenameDialog } from './library-files-rename-dialog';
import {
  createLibraryFilesDestinationSuccessFeedback,
  createLibraryFilesRenameSuccessFeedback,
  type LibraryFilesSuccessFeedback,
} from './library-files-success-feedback';
import { useLibraryFilesConfirmationFlow } from './use-library-files-confirmation-flow';

const isSameRow = (left: LibraryFilesRow, right: LibraryFilesRow) => {
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

const applySuggestedNameToRow = (row: LibraryFilesRow, nextName: string) => {
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

type UseLibraryFilesRowActionFlowsOptions = {
  authorization?: DriveSessionMenuController;
  canMutateLibrary: boolean;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  files: UseLibraryFilesResult;
  isLoopBuilderPreparing: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  pendingLoopBuilderSourceId: string | null;
  onOpenLoopBuilderForSource: (source: DriveLibrarySource) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onOpenFolderTagEditor: (folder: RehearsalLibraryFolderNode) => void;
  onOpenPlaylistAddItems: (playlistId: string) => void;
  onOpenPlaylistTagEditor: (playlistId: string) => void;
  onOpenSourcePlaylistSelector: (sourceId: string) => void;
  onOpenSourceTagEditor: (source: DriveLibrarySource) => void;
  onOpenLoopTagEditor: (loopId: string) => void;
  onShowSuccessFeedback?: (feedback: LibraryFilesSuccessFeedback) => void;
  onQueuePlayableItemNext: (playableItem: PlayableItem) => void;
  onQueuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  onRemoveSource: (source: DriveLibrarySource) => void;
};

export const useLibraryFilesRowActionFlows = ({
  authorization,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  files,
  isLoopBuilderPreparing,
  isLoopMutating,
  isPlaylistMutating,
  isSavedLibraryMutating,
  pendingLoopBuilderSourceId,
  onOpenLoopBuilderForSource,
  onOpenLoopPlaylistSelector,
  onOpenFolderTagEditor,
  onOpenPlaylistAddItems,
  onOpenPlaylistTagEditor,
  onOpenSourcePlaylistSelector,
  onOpenSourceTagEditor,
  onOpenLoopTagEditor,
  onShowSuccessFeedback,
  onQueuePlayableItemNext,
  onQueuePlayableItemUpNext,
  onRemoveSource,
}: UseLibraryFilesRowActionFlowsOptions) => {
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
  const confirmationFlow = useLibraryFilesConfirmationFlow();
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
      const result =
        pendingDestinationAction.kind === 'copy' && row.kind !== 'folder'
          ? await files.createFileLinkCopy({
              destinationFolderId: folderId,
              fileLink: row.fileLink,
              sourceName: row.label,
              visibleName,
            })
          : row.kind === 'folder'
            ? await files.moveFolder({
                destinationFolderId: folderId,
                folder: row.folder,
              })
            : await files.moveFileLink({
                destinationFolderId: folderId,
                fileLink: row.fileLink,
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
      const result =
        pendingRenameRow.kind === 'folder'
          ? await files.renameFolder({
              folder: pendingRenameRow.folder,
              name: nextDraftName,
            })
          : await files.renameFileLink({
              fileLink: pendingRenameRow.fileLink,
              name: nextDraftName,
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

  const handleDeleteFileNode = (row: LibraryFilesRow) => {
    requestLibraryFilesDeleteConfirmation({
      files,
      onShowSuccessFeedback,
      requestConfirmation: confirmationFlow.requestConfirmation,
      row,
    });
  };

  const destinationPicker = buildLibraryFilesDestinationPicker({
    currentPickerFolderId: currentDestinationPickerFolderId,
    files,
    issue: destinationIssue,
    isMutating: isFileActionMutating || confirmationFlow.isConfirming,
    onOpenDestinationFolder(folderId) {
      clearDestinationIssue();
      setCurrentDestinationPickerFolderId(folderId);
    },
    onRenameBeforeRetry(suggestedName) {
      clearDestinationIssue();
      setPendingRenameRow(pendingDestinationAction?.row ?? null);
      setRenameDraftName(suggestedName);
    },
    onRetryCopyWithSuggestedName(folderId, suggestedName) {
      handleSubmitDestination(folderId, suggestedName);
    },
    onSubmitDestination(folderId) {
      handleSubmitDestination(folderId);
    },
    pendingAction: pendingDestinationAction,
  });

  return {
    createMenuActions(row: LibraryFilesRow) {
      return resolveFilesRowMenuActions({
        canMutateLibrary,
        canMutateLoops,
        canMutatePlaylists,
        canQueueAsNext,
        canReconnectLibrarySource: Boolean(
          authorization?.canStartAuthorization && !authorization.isBusy,
        ),
        isLoopBuilderPreparing,
        isLoopMutating,
        isPlaylistMutating,
        isSavedLibraryMutating,
        pendingLoopBuilderSourceId,
        onCreateFileLinkCopy(rowToCopy: FileLinkLibraryFilesRow) {
          clearDestinationIssue();
          setPendingDestinationAction({ kind: 'copy', row: rowToCopy });
          setCurrentDestinationPickerFolderId(
            files.explorer?.currentFolder.id ?? null,
          );
        },
        onDeleteFileNode: handleDeleteFileNode,
        onMoveFileNode(rowToMove) {
          clearDestinationIssue();
          setPendingDestinationAction({ kind: 'move', row: rowToMove });
          setCurrentDestinationPickerFolderId(
            files.explorer?.currentFolder.id ?? null,
          );
        },
        onOpenFolder(folderId) {
          files.openFolder(folderId);
        },
        onOpenFolderTagEditor(folderId) {
          if (row.kind === 'folder' && row.folder.id === folderId) {
            onOpenFolderTagEditor(row.folder);
          }
        },
        onOpenLoopBuilder(sourceId) {
          if (row.kind === 'track' && row.source.id === sourceId) {
            onOpenLoopBuilderForSource(row.source);
            return;
          }

          if (row.kind === 'loop' && row.source?.id === sourceId) {
            onOpenLoopBuilderForSource(row.source);
          }
        },
        onOpenLoopPlaylistSelector,
        onOpenLoopTagEditor,
        onOpenPlaylistAddItems,
        onOpenPlaylistTagEditor,
        onOpenSourcePlaylistSelector,
        onOpenSourceTagEditor(sourceId) {
          if (row.kind === 'track' && row.source.id === sourceId) {
            onOpenSourceTagEditor(row.source);
          }
        },
        onQueuePlayableItemNext,
        onQueuePlayableItemUpNext,
        onReconnectLibrarySource() {
          void authorization?.startAuthorization();
        },
        onRenameFileNode(rowToRename) {
          clearRenameIssue();
          setPendingRenameRow(rowToRename);
          setRenameDraftName(rowToRename.label);
        },
        onRemoveLibrarySource() {
          if (row.kind !== 'track') {
            return;
          }

          const impact = files.getTrackRemoveFromLibraryImpact(row.source.id);

          confirmationFlow.requestConfirmation({
            content: {
              affectedSections:
                getTrackRemoveFromLibraryAffectedSections(impact),
              confirmLabel: 'Remove from library',
              message: formatTrackRemoveFromLibraryImpactMessage(row, impact),
              title: 'Remove from library?',
            },
            onConfirm: () => {
              onRemoveSource(row.source);
            },
          });
        },
        row,
      });
    },
    destinationPicker: (
      <OptionsMenuSheet
        actions={destinationPicker.actions}
        isSecondaryDisabled={isFileActionMutating}
        isVisible={
          pendingDestinationAction !== null && pendingRenameRow === null
        }
        onClose={() => {
          if (!isFileActionMutating) {
            clearDestinationIssue();
            setPendingDestinationAction(null);
            setCurrentDestinationPickerFolderId(null);
          }
        }}
        secondaryActionLabel="Cancel"
        title={destinationPicker.title}
      >
        {destinationPicker.issue ? (
          <FeedbackCard
            message={destinationPicker.issue.message}
            size="compact"
            title={destinationPicker.issue.title}
            tone="error"
          />
        ) : null}
      </OptionsMenuSheet>
    ),
    isRenamingPlaylist: pendingRenameRow?.kind === 'playlist',
    renameDialog: (
      <>
        <LibraryFilesRenameDialog
          isMutating={isFileActionMutating}
          isVisible={pendingRenameRow !== null}
          issue={renameIssue}
          onCancel={() => {
            clearRenameIssue();
            setPendingRenameRow(null);
            setRenameDraftName('');
          }}
          onChange={(nextValue) => {
            clearRenameIssue();
            setRenameDraftName(nextValue);
          }}
          onRecoverSuggestedName={handleSubmitRename}
          onSubmit={() => {
            handleSubmitRename();
          }}
          value={renameDraftName}
        />
        {confirmationFlow.confirmationDialog}
      </>
    ),
  };
};
