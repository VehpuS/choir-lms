import type {
  NamedLoop,
  PlayableItem,
  RehearsalLibraryFolderNode,
} from '@org/audio-library-models';

import type { DriveSessionMenuController } from '../../../auth/google-drive/components/drive-session-menu/drive-session-menu-controller';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import type { UseLibraryFilesResult } from '../../saved-rehearsal-library/use-library-files';
import { FeedbackCard } from '../feedback-card';
import { OptionsMenuSheet } from '../options-menu-sheet';
import { useHasLyricsFor } from '../saved-item-menu/saved-item-availability-context';
import { resolveFilesRowMenuActions } from './files-row-actions';
import type { FileLinkLibraryFilesRow } from './files-row-actions-model';
import { createTrackRemoveFromLibraryConfirmation } from './library-files-delete-copy';
import { requestLibraryFilesDeleteConfirmation } from './library-files-delete-flow';
import { buildLibraryFilesDestinationPicker } from './library-files-destination-actions';
import { getRowSource, getTrackRowSource } from './files-row-identity';
import { useLibraryFilesPlacementFlow } from './use-library-files-placement-flow';
import { LibraryFilesRenameDialog } from './library-files-rename-dialog';
import { type LibraryFilesSuccessFeedback } from './library-files-success-feedback';
import { useLibraryFilesConfirmationFlow } from '../../selection/use-library-files-confirmation-flow';

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
  onEditLoop: (loop: NamedLoop) => void;
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
  /** The Loops / Playlists views' removal flows, shared by Files (2.12). */
  onRemoveLoop: (loop: NamedLoop) => void;
  onRemovePlaylist: (playlistId: string) => void;
  onViewTrackLoops: (sourceId: string) => void;
  originalLocationActions: ReturnType<
    typeof useRehearsalLibraryController
  >['originalLocation'];
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
  onEditLoop,
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
  onRemoveLoop,
  onRemovePlaylist,
  onViewTrackLoops,
  originalLocationActions,
}: UseLibraryFilesRowActionFlowsOptions) => {
  const confirmationFlow = useLibraryFilesConfirmationFlow();
  const hasLyricsFor = useHasLyricsFor();
  const {
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
  } = useLibraryFilesPlacementFlow({ files, onShowSuccessFeedback });

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
        hasLyricsFor,
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
        onEditLoop,
        onOpenLoopBuilder(sourceId) {
          const source = getRowSource(row, sourceId);

          if (source) {
            onOpenLoopBuilderForSource(source);
          }
        },
        onOpenLoopPlaylistSelector,
        onOpenLoopTagEditor,
        onOpenPlaylistAddItems,
        onOpenPlaylistTagEditor,
        onOpenSourceInGoogleDrive(sourceId) {
          const source = getTrackRowSource(row, sourceId);

          if (source) {
            originalLocationActions.openSourceInGoogleDrive(source);
          }
        },
        onOpenSourcePlaylistSelector,
        onOpenSourceTagEditor(sourceId) {
          const source = getTrackRowSource(row, sourceId);

          if (source) {
            onOpenSourceTagEditor(source);
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
            content: createTrackRemoveFromLibraryConfirmation(row, impact),
            // This dialog is the confirmation; the removal itself must not ask
            // again.
            onConfirm: () => {
              onRemoveSource(row.source);
            },
          });
        },
        onRemoveLoop,
        onRemovePlaylist,
        onViewTrackLoops,
        onShowSourceInAdd(sourceId) {
          const source = getTrackRowSource(row, sourceId);

          if (source) {
            originalLocationActions.showSourceInAdd(source);
          }
        },
        pendingSourceLocationAction:
          originalLocationActions.pendingSourceLocationAction,
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
