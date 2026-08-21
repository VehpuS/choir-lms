import { type NamedLoop, type Playlist } from '@org/audio-library-models';
import { View } from 'react-native';

import { savedPlaylistSectionStyles as styles } from '../../components/saved-playlist-section-styles';
import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import type { SavedTrackPlaybackState } from '../../playback/utils/saved-track-playback-view-model';
import { usePlaylistDetailHeaderPlayback } from '../hooks/use-playlist-detail-header-playback';
import { useSavedPlaylistDetailActions } from '../hooks/use-saved-playlist-detail-actions';
import { useSavedPlaylistSectionState } from '../hooks/use-saved-playlist-section-state';
import {
  buildSavedPlaylistDetailDraftPlaylist,
  isSavedPlaylistEntryPlayable,
} from '../utils/saved-playlist-detail-view-model';
import { getSavedPlaylistPlaybackToggleLabel } from '../utils/saved-playlist-playback-toggle-label';
import {
  getPlaylistPlaybackActionCopy,
  getPlaylistPlaybackCurrentItem,
  type PlaylistDetailHeaderPlaybackAction,
  type PlaylistPlaybackSession,
} from '../utils/saved-playlist-playback-view-model';
import {
  getSavedPlaylistsStatusCopy,
  getSelectedPlaylistIssue,
} from '../utils/saved-playlist-status-view-model';
import {
  getSavedPlaylistDetailSummary,
  getSavedPlaylistEntryDetailLabel,
  type SavedPlaylistIssue,
} from '../utils/saved-playlist-view-model';
import { SavedPlaylistCreateDialog } from './saved-playlist-create-dialog';
import { SavedPlaylistDetailCard } from './saved-playlist-section-cards';
import { SavedPlaylistSectionHeader } from './saved-playlist-section-header';

type SavedPlaylistSectionProps = {
  activePlaylistSession: PlaylistPlaybackSession | null;
  canMutatePlaylists: boolean;
  createPlaylist: (playlist: Playlist) => Promise<Playlist | null>;
  deletePlaylist: (playlist: Playlist) => Promise<boolean>;
  detailAddItemsActionLabel: string | null;
  detailEmptyStateMessage: string;
  getCurrentScrollOffsetY: () => number;
  isDetailVisible?: boolean;
  isLoading: boolean;
  isPlaybackPreparing: boolean;
  issue: SavedPlaylistIssue | null;
  onAddItems?: () => void;
  onCloseDetail?: () => void;
  onDetailPlaybackChange?: (
    action: PlaylistDetailHeaderPlaybackAction | null,
  ) => void;
  onEditPlaylistTags: (playlistId: string) => void;
  onRenameDialogVisibilityChange?: (isVisible: boolean) => void;
  pendingPlaylistId: string | null;
  playbackState: SavedTrackPlaybackState | undefined;
  savedPlaylists: Playlist[];
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  selectedPlaylist: Playlist | null;
  setSelectedPlaylistId: (playlistId: string) => void;
  setIsReorderDragActive: (isActive: boolean) => void;
  setReorderDragMoveY: (moveY: number) => void;
  showBrowseHeader?: boolean;
  toggleActivePlayback: () => Promise<void>;
  togglePlaylistPlayback: (options: {
    loops: NamedLoop[];
    mode: 'ordered' | 'shuffle';
    playlist: Playlist;
    sources: DriveLibrarySource[];
    startEntryId?: string;
  }) => Promise<void>;
  updatePlaylist: (playlist: Playlist) => Promise<Playlist | null>;
};

export const SavedPlaylistSection = ({
  activePlaylistSession,
  canMutatePlaylists,
  createPlaylist,
  deletePlaylist,
  detailAddItemsActionLabel,
  detailEmptyStateMessage,
  getCurrentScrollOffsetY,
  isDetailVisible = false,
  isLoading,
  isPlaybackPreparing,
  issue,
  onAddItems,
  onCloseDetail,
  onDetailPlaybackChange,
  onEditPlaylistTags,
  onRenameDialogVisibilityChange,
  pendingPlaylistId,
  playbackState,
  savedPlaylists,
  savedLoops,
  savedSources,
  selectedPlaylist,
  setSelectedPlaylistId,
  setIsReorderDragActive,
  setReorderDragMoveY,
  showBrowseHeader = true,
  toggleActivePlayback,
  togglePlaylistPlayback,
  updatePlaylist,
}: SavedPlaylistSectionProps) => {
  const {
    createPlaylistName,
    creationIssue,
    confirmationDialog,
    detailDraftEntries,
    handleCloseDetail,
    handleCommitReorder,
    handleCreatePlaylist,
    handleCreatePlaylistNameChange,
    handleDeletePlaylist,
    handleDismissRemovalNotice,
    closeCreatePlaylistDialog,
    handleMoveItem,
    handleRemovePlaylistItem,
    handleRenamePlaylist,
    handleRenamePlaylistNameChange,
    handleUndoPlaylistRemoval,
    isCreatePlaylistDialogVisible,
    isMutating,
    openCreatePlaylistDialog,
    removalNotice,
    renameIssue,
    renamePlaylistName,
  } = useSavedPlaylistSectionState({
    createPlaylist,
    deletePlaylist,
    isDetailVisible,
    onCloseDetail,
    pendingPlaylistId,
    selectedPlaylist,
    setIsReorderDragActive,
    setSelectedPlaylistId,
    updatePlaylist,
  });
  const statusCopy = getSavedPlaylistsStatusCopy({
    isLoading,
    issue,
    savedPlaylistCount: savedPlaylists.length,
  });
  const selectedPlaybackSession =
    activePlaylistSession?.playlistId === selectedPlaylist?.id
      ? activePlaylistSession
      : null;
  const orderedPlaybackAction = getPlaylistPlaybackActionCopy({
    activeSession: selectedPlaybackSession,
    isPreparing: isPlaybackPreparing,
    mode: 'ordered',
    playbackState,
    selectedPlaylist,
  });
  const selectedPlaylistIssue = getSelectedPlaylistIssue(
    issue,
    selectedPlaylist?.id ?? null,
  );
  const detailPlaylist = selectedPlaylist
    ? buildSavedPlaylistDetailDraftPlaylist(
        selectedPlaylist,
        detailDraftEntries,
        selectedPlaylist.updatedAt,
      )
    : null;
  const detailSummary = detailPlaylist
    ? getSavedPlaylistDetailSummary({
        activeSession: selectedPlaybackSession,
        playlist: detailPlaylist,
        savedLoops,
        savedSources,
      })
    : null;
  const currentPlaylistEntryId = selectedPlaybackSession
    ? (getPlaylistPlaybackCurrentItem(selectedPlaybackSession)
        ?.playlistEntryId ?? null)
    : null;
  const playlistPlaybackToggleLabel = getSavedPlaylistPlaybackToggleLabel({
    isPlaybackPreparing,
    playbackState,
  });
  const shouldShowStatusCard = isLoading || statusCopy.tone !== 'ready';
  const detailActions = useSavedPlaylistDetailActions({
    onEditPlaylistTags,
    savedLoops,
    savedSources,
    selectedPlaylist,
    toggleActivePlayback,
    togglePlaylistPlayback,
  });

  usePlaylistDetailHeaderPlayback({
    isDetailVisible,
    isMutating,
    onDetailPlaybackChange,
    orderedPlaybackActionDisabled: orderedPlaybackAction.disabled,
    orderedPlaybackActionLabel: orderedPlaybackAction.label,
    playOrderedPlaylist: detailActions.playOrderedPlaylist,
    playlistTitle: detailSummary?.title,
  });

  return (
    <View style={styles.section}>
      {!isDetailVisible && showBrowseHeader ? (
        <SavedPlaylistSectionHeader
          canMutatePlaylists={canMutatePlaylists}
          isMutating={isMutating}
          onOpenCreateDialog={openCreatePlaylistDialog}
        />
      ) : null}

      {shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={isLoading}
          loadingLabel="Refreshing saved playlists…"
          statusCopy={statusCopy}
        />
      ) : null}

      <SavedPlaylistCreateDialog
        issue={creationIssue}
        isMutating={isMutating}
        isVisible={isCreatePlaylistDialogVisible}
        onChange={handleCreatePlaylistNameChange}
        onCancel={closeCreatePlaylistDialog}
        onSubmit={() => {
          void handleCreatePlaylist();
        }}
        value={createPlaylistName}
      />

      {isDetailVisible ? (
        <SavedPlaylistDetailCard
          addItemsActionLabel={detailAddItemsActionLabel}
          canMutatePlaylists={canMutatePlaylists}
          currentPlaylistEntryId={currentPlaylistEntryId}
          detailSummary={detailSummary}
          detailEntries={detailDraftEntries}
          emptyStateMessage={detailEmptyStateMessage}
          getCurrentScrollOffsetY={getCurrentScrollOffsetY}
          getItemDetailLabel={(entry) => {
            return getSavedPlaylistEntryDetailLabel({
              entry,
              savedLoops,
              savedSources,
            });
          }}
          isItemPlayable={(entry) => {
            return isSavedPlaylistEntryPlayable({
              entry,
              savedLoops,
              savedSources,
            });
          }}
          isMutating={isMutating}
          onAddItems={onAddItems}
          onCloseDetail={handleCloseDetail}
          onDismissRemovalNotice={handleDismissRemovalNotice}
          onEditPlaylistTags={detailActions.editPlaylistTags}
          onCommitReorder={handleCommitReorder}
          onDeletePlaylist={handleDeletePlaylist}
          onMoveItem={handleMoveItem}
          onRenameDialogVisibilityChange={onRenameDialogVisibilityChange}
          onRemoveItem={(entryId) => {
            void handleRemovePlaylistItem(entryId);
          }}
          onRenamePlaylist={() => {
            void handleRenamePlaylist();
          }}
          onRenamePlaylistNameChange={handleRenamePlaylistNameChange}
          onPlayPlaylistEntry={detailActions.playPlaylistEntry}
          onToggleCurrentPlayback={detailActions.toggleCurrentPlayback}
          onReorderDragActiveChange={setIsReorderDragActive}
          onReorderDragMove={setReorderDragMoveY}
          onUndoRemoveItem={() => {
            void handleUndoPlaylistRemoval();
          }}
          playbackToggleDisabled={isPlaybackPreparing}
          playbackToggleLabel={playlistPlaybackToggleLabel}
          renameIssue={renameIssue}
          renamePlaylistName={renamePlaylistName}
          removalNotice={removalNotice}
          selectedPlaylist={selectedPlaylist}
          selectedPlaylistIssue={selectedPlaylistIssue}
        />
      ) : null}

      {confirmationDialog}
    </View>
  );
};
