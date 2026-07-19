import { useState } from 'react';

import type { PlayableItem } from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { OptionsMenuSheet } from '../options-menu-sheet';
import {
  getDeleteFromFolderConfirmationCopy,
  resolveFilesRowMenuActions,
} from './files-row-actions';
import type { FileLinkLibraryFilesRow } from './files-row-actions-model';
import { formatFolderDeleteImpactMessage } from './library-files-delete-copy';
import {
  buildLibraryFilesDestinationActions,
  type PendingLibraryFilesDestinationAction,
} from './library-files-destination-actions';
import { LibraryFilesRenameDialog } from './library-files-rename-dialog';
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
  onQueuePlayableItemNext,
  onQueuePlayableItemUpNext,
  onRemoveSource,
}: UseLibraryFilesRowActionFlowsOptions) => {
  const [isFileActionMutating, setIsFileActionMutating] = useState(false);
  const [pendingDestinationAction, setPendingDestinationAction] =
    useState<PendingLibraryFilesDestinationAction | null>(null);
  const [pendingRenameRow, setPendingRenameRow] =
    useState<LibraryFilesRow | null>(null);
  const [renameDraftName, setRenameDraftName] = useState('');
  const confirmationFlow = useLibraryFilesConfirmationFlow();

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
        setPendingDestinationAction(null);
        files.openFolder(folderId);
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
        setPendingRenameRow(null);
        setRenameDraftName('');
      }
    })();
  };

  const handleDeleteFileNode = (row: LibraryFilesRow) => {
    if (row.kind === 'folder') {
      const impact = files.getFolderDeleteImpact(row.folder.id);

      if (!impact || impact.isRootFolder) {
        return;
      }

      confirmationFlow.requestConfirmation({
        content: {
          confirmLabel: 'Delete folder',
          message: formatFolderDeleteImpactMessage(row, impact),
          title: 'Delete folder?',
        },
        onConfirm: async () => {
          await files.deleteFolder(row.folder.id);
        },
      });
      return;
    }

    const impact = files.getFileLinkDeleteImpact(row.fileLink);
    const copy = getDeleteFromFolderConfirmationCopy({
      isLastLink: impact.isLastLink,
      itemName: row.label,
    });

    confirmationFlow.requestConfirmation({
      content: copy,
      onConfirm: async () => {
        await files.deleteFileLink(row.fileLink.id);
      },
    });
  };

  const destinationActions = buildLibraryFilesDestinationActions({
    files,
    isMutating: isFileActionMutating || confirmationFlow.isConfirming,
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
        },
        onDeleteFileNode: handleDeleteFileNode,
        onMoveFileNode(rowToMove) {
          setPendingDestinationAction({ kind: 'move', row: rowToMove });
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

          confirmationFlow.requestConfirmation({
            content: {
              confirmLabel: 'Remove from library',
              message: `"${row.source.name}" will be removed from your saved rehearsal library and every Files folder link that points to it.`,
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
        actions={destinationActions}
        isSecondaryDisabled={isFileActionMutating}
        isVisible={pendingDestinationAction !== null}
        onClose={() => {
          if (!isFileActionMutating) {
            setPendingDestinationAction(null);
          }
        }}
        secondaryActionLabel="Cancel"
        title={
          pendingDestinationAction?.kind === 'copy'
            ? 'Copy to folder'
            : 'Move to folder'
        }
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
