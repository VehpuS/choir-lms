import { useState } from 'react';

import type { PlayableItem } from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
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
  onOpenLoopBuilderForSource: (source: DriveLibrarySource) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
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
  onOpenLoopBuilderForSource,
  onOpenLoopPlaylistSelector,
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
  const [renameDraftName, setRenameDraftName] = useState('');
  const confirmationFlow = useLibraryFilesConfirmationFlow();
  const getFolderName = (folderId: string) => {
    return files.destinationFolders.find((destination) => {
      return destination.folder.id === folderId;
    })?.folder.name;
  };

  const handleSubmitDestination = (folderId: string) => {
    if (!pendingDestinationAction) {
      return;
    }

    setIsFileActionMutating(true);

    void (async () => {
      const row = pendingDestinationAction.row;
      const didComplete =
        pendingDestinationAction.kind === 'copy' && row.kind !== 'folder'
          ? await files.createFileLinkCopy({
              destinationFolderId: folderId,
              fileLink: row.fileLink,
              sourceName: row.label,
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

      if (didComplete) {
        const destinationFolderName =
          getFolderName(folderId) ?? 'the selected folder';

        setPendingDestinationAction(null);
        setCurrentDestinationPickerFolderId(null);
        files.openFolder(folderId);
        onShowSuccessFeedback?.(
          createLibraryFilesDestinationSuccessFeedback({
            destinationFolderName,
            kind: pendingDestinationAction.kind,
            row,
          }),
        );
      }
    })();
  };

  const handleSubmitRename = () => {
    if (!pendingRenameRow) {
      return;
    }

    setIsFileActionMutating(true);

    void (async () => {
      const didRename =
        pendingRenameRow.kind === 'folder'
          ? await files.renameFolder({
              folder: pendingRenameRow.folder,
              name: renameDraftName,
            })
          : await files.renameFileLink({
              fileLink: pendingRenameRow.fileLink,
              name: renameDraftName,
            });

      setIsFileActionMutating(false);

      if (didRename) {
        const nextName = renameDraftName.trim();

        setPendingRenameRow(null);
        setRenameDraftName('');
        onShowSuccessFeedback?.(
          createLibraryFilesRenameSuccessFeedback({
            nextName,
            previousName: pendingRenameRow.label,
          }),
        );
      }
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
    isMutating: isFileActionMutating || confirmationFlow.isConfirming,
    onOpenDestinationFolder(folderId) {
      setCurrentDestinationPickerFolderId(folderId);
    },
    onSubmitDestination: handleSubmitDestination,
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
        onCreateFileLinkCopy(rowToCopy: FileLinkLibraryFilesRow) {
          setPendingDestinationAction({ kind: 'copy', row: rowToCopy });
          setCurrentDestinationPickerFolderId(
            files.explorer?.currentFolder.id ?? null,
          );
        },
        onDeleteFileNode: handleDeleteFileNode,
        onMoveFileNode(rowToMove) {
          setPendingDestinationAction({ kind: 'move', row: rowToMove });
          setCurrentDestinationPickerFolderId(
            files.explorer?.currentFolder.id ?? null,
          );
        },
        onOpenFolder(folderId) {
          files.openFolder(folderId);
        },
        onOpenLoopBuilder() {
          if (row.kind === 'track') {
            onOpenLoopBuilderForSource(row.source);
          }
        },
        onOpenLoopPlaylistSelector,
        onOpenLoopTagEditor,
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
        isVisible={pendingDestinationAction !== null}
        onClose={() => {
          if (!isFileActionMutating) {
            setPendingDestinationAction(null);
            setCurrentDestinationPickerFolderId(null);
          }
        }}
        secondaryActionLabel="Cancel"
        title={destinationPicker.title}
      />
    ),
    renameDialog: (
      <>
        <LibraryFilesRenameDialog
          isMutating={isFileActionMutating}
          isVisible={pendingRenameRow !== null}
          issue={files.issue}
          onCancel={() => {
            setPendingRenameRow(null);
            setRenameDraftName('');
          }}
          onChange={setRenameDraftName}
          onSubmit={handleSubmitRename}
          value={renameDraftName}
        />
        {confirmationFlow.confirmationDialog}
      </>
    ),
  };
};
