import type { Playlist } from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { OverflowMenuTrigger } from '../../components/OverflowMenuTrigger';
import {
  consumeSavedPlaylistRenameRequest,
  type SavedPlaylistDetailRemovalNotice,
} from '../utils/saved-playlist-detail-view-model';
import type { PlaylistPlaybackActionCopy } from '../utils/saved-playlist-playback-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistDetailSummary,
} from '../utils/saved-playlist-view-model';
import {
  PlaylistOptionsMenuSurface,
  PlaylistRenameDialog,
} from './PlaylistRenameDialog';
import { savedPlaylistSectionStyles as styles } from './saved-playlist-section-styles';
import { SavedLibraryDetailCardShell } from './SavedLibraryDetailCardShell';
import { SavedPlaylistDetailItemsList } from './SavedPlaylistDetailItemsList';

type PlaylistEntry = Playlist['items'][number];

export const SavedPlaylistDetailCard = (props: {
  canMutatePlaylists: boolean;
  currentPlaylistEntryId: string | null;
  detailSummary: SavedPlaylistDetailSummary | null;
  detailEntries: PlaylistEntry[];
  getCurrentScrollOffsetY: () => number;
  getItemDetailLabel: (entry: PlaylistEntry) => string;
  isItemPlayable: (entry: PlaylistEntry) => boolean;
  isMutating: boolean;
  orderedPlaybackAction: PlaylistPlaybackActionCopy;
  playbackToggleDisabled: boolean;
  playbackToggleLabel: string;
  renameIssue: PlaylistDraftIssue | null;
  renamePlaylistName: string;
  removalNotice: SavedPlaylistDetailRemovalNotice | null;
  selectedPlaylist: Playlist | null;
  selectedPlaylistIssue: PlaylistDraftIssue | null;
  onCommitReorder: () => void;
  onCloseDetail: () => void;
  onDeletePlaylist: () => void;
  onDismissRemovalNotice: () => void;
  onMoveItem: (
    fromIndex: number,
    toIndex: number,
    options?: { persist?: boolean },
  ) => void;
  onPlayOrderedPlaylist: () => void;
  onPlayPlaylistEntry: (entryId: string) => void;
  onRemoveItem: (entryId: string) => void;
  onRenamePlaylist: () => void;
  onRenamePlaylistNameChange: (value: string) => void;
  onReorderDragActiveChange: (isActive: boolean) => void;
  onReorderDragMove: (moveY: number) => void;
  onToggleCurrentPlayback: () => void;
  onUndoRemoveItem: () => void;
}) => {
  const { detailSummary, selectedPlaylist } = props;
  const [isOptionsMenuVisible, setIsOptionsMenuVisible] = useState(false);
  const [isRenameDialogVisible, setIsRenameDialogVisible] = useState(false);

  useEffect(() => {
    if (!selectedPlaylist) {
      setIsOptionsMenuVisible(false);
      setIsRenameDialogVisible(false);
      return;
    }

    if (consumeSavedPlaylistRenameRequest(selectedPlaylist.id)) {
      setIsRenameDialogVisible(true);
    }
  }, [selectedPlaylist?.id]);

  if (!selectedPlaylist || !detailSummary) {
    return null;
  }

  return (
    <SavedLibraryDetailCardShell
      body={detailSummary.body}
      closeAccessibilityLabel="Close playlist detail"
      eyebrow="Playlist detail"
      headerAction={
        <OverflowMenuTrigger
          accessibilityLabel="Playlist options"
          disabled={!props.canMutatePlaylists || props.isMutating}
          onPress={() => {
            setIsOptionsMenuVisible(true);
          }}
        />
      }
      metadataLabel={detailSummary.metadataLabel}
      onClose={props.onCloseDetail}
      primaryAction={{
        disabled: props.isMutating || props.orderedPlaybackAction.disabled,
        label: `▶ ${props.orderedPlaybackAction.label}`,
        onPress: props.onPlayOrderedPlaylist,
        tone: 'primary',
      }}
      title={detailSummary.title}
    >
      <SavedPlaylistDetailItemsList
        currentPlaylistEntryId={props.currentPlaylistEntryId}
        detailEntries={props.detailEntries}
        getCurrentScrollOffsetY={props.getCurrentScrollOffsetY}
        getItemDetailLabel={props.getItemDetailLabel}
        isItemPlayable={props.isItemPlayable}
        isMutating={props.isMutating}
        onCommitReorder={props.onCommitReorder}
        onMoveItem={props.onMoveItem}
        onPlayPlaylistEntry={props.onPlayPlaylistEntry}
        onReorderDragActiveChange={props.onReorderDragActiveChange}
        onReorderDragMove={props.onReorderDragMove}
        onRemoveItem={props.onRemoveItem}
        onToggleCurrentPlayback={props.onToggleCurrentPlayback}
        playbackToggleDisabled={props.playbackToggleDisabled}
        playbackToggleLabel={props.playbackToggleLabel}
      />

      <PlaylistRenameDialog
        isMutating={props.isMutating}
        isVisible={isRenameDialogVisible}
        issue={props.renameIssue ?? props.selectedPlaylistIssue}
        onCancel={() => {
          setIsRenameDialogVisible(false);
        }}
        onChange={props.onRenamePlaylistNameChange}
        onSubmit={() => {
          props.onRenamePlaylist();
        }}
        playlistName={detailSummary.title}
        value={props.renamePlaylistName}
      />

      <PlaylistOptionsMenuSurface
        isMutating={props.isMutating}
        isVisible={isOptionsMenuVisible}
        onClose={() => {
          setIsOptionsMenuVisible(false);
        }}
        onRemove={() => {
          setIsOptionsMenuVisible(false);
          props.onDeletePlaylist();
        }}
        onRename={() => {
          setIsOptionsMenuVisible(false);
          setIsRenameDialogVisible(true);
        }}
        playlistName={detailSummary.title}
      />

      <Modal
        animationType="fade"
        onRequestClose={props.onDismissRemovalNotice}
        transparent
        visible={props.removalNotice !== null}
      >
        <View style={styles.snackbarModalOverlay} pointerEvents="box-none">
          <View style={[styles.snackbarCard, styles.modalSnackbarCard]}>
            <Text style={styles.snackbarMessage}>
              {props.removalNotice?.entry.title} removed from{' '}
              {detailSummary.title}.
            </Text>
            <View style={styles.actionRow}>
              <Pressable
                accessibilityRole="button"
                disabled={props.isMutating}
                onPress={props.onUndoRemoveItem}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && !props.isMutating
                    ? styles.actionButtonPressed
                    : undefined,
                  props.isMutating ? styles.actionButtonDisabled : undefined,
                ]}
              >
                <Text style={styles.primaryButtonLabel}>Undo</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={props.isMutating}
                onPress={props.onDismissRemovalNotice}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && !props.isMutating
                    ? styles.actionButtonPressed
                    : undefined,
                  props.isMutating ? styles.actionButtonDisabled : undefined,
                ]}
              >
                <Text style={styles.secondaryButtonLabel}>Dismiss</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SavedLibraryDetailCardShell>
  );
};
