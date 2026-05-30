import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Playlist } from '@org/audio-library-models';
import { useEffect, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

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
import { SavedPlaylistDetailItemsList } from './SavedPlaylistDetailItemsList';

type PlaylistEntry = Playlist['items'][number];

export const SavedPlaylistDetailCard = (props: {
  canMutatePlaylists: boolean;
  currentPlaylistEntryId: string | null;
  detailSummary: SavedPlaylistDetailSummary | null;
  detailEntries: PlaylistEntry[];
  getCurrentScrollOffsetY: () => number;
  getItemDetailLabel: (entry: PlaylistEntry) => string;
  isEditMode: boolean;
  isItemPlayable: (entry: PlaylistEntry) => boolean;
  isMutating: boolean;
  orderedPlaybackAction: PlaylistPlaybackActionCopy;
  renameIssue: PlaylistDraftIssue | null;
  renamePlaylistName: string;
  removalNotice: SavedPlaylistDetailRemovalNotice | null;
  selectedPlaylist: Playlist | null;
  selectedPlaylistIssue: PlaylistDraftIssue | null;
  onCloseDetail: () => void;
  onDeletePlaylist: () => void;
  onDismissRemovalNotice: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPlayOrderedPlaylist: () => void;
  onPlayPlaylistEntry: (entryId: string) => void;
  onRemoveItem: (entryId: string) => void;
  onRenamePlaylist: () => void;
  onRenamePlaylistNameChange: (value: string) => void;
  onReorderDragActiveChange: (isActive: boolean) => void;
  onReorderDragMove: (moveY: number) => void;
  onToggleEditMode: () => void;
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
    <View style={styles.editorCard}>
      <Pressable
        accessibilityRole="button"
        onPress={props.onCloseDetail}
        style={({ pressed }) => [
          styles.compactIconButton,
          pressed ? styles.actionButtonPressed : undefined,
        ]}
      >
        <Text style={styles.secondaryButtonLabel}>←</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Playlist detail</Text>
          <Text style={styles.sectionTitle}>{detailSummary.title}</Text>
          <Text style={styles.sectionBody}>{detailSummary.metadataLabel}</Text>
          {detailSummary.body ? (
            <Text style={styles.editorBody}>{detailSummary.body}</Text>
          ) : null}
        </View>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={!props.canMutatePlaylists || props.isMutating}
            onPress={props.onToggleEditMode}
            style={({ pressed }) => [
              props.isEditMode ? styles.primaryButton : styles.secondaryButton,
              pressed && props.canMutatePlaylists && !props.isMutating
                ? styles.actionButtonPressed
                : undefined,
              !props.canMutatePlaylists || props.isMutating
                ? styles.actionButtonDisabled
                : undefined,
            ]}
          >
            <Text
              style={
                props.isEditMode
                  ? styles.primaryButtonLabel
                  : styles.secondaryButtonLabel
              }
            >
              {props.isEditMode ? '✓ Save' : '↕ Edit order'}
            </Text>
          </Pressable>
        </View>
      </View>

      {!props.isEditMode ? (
        <Pressable
          accessibilityLabel="Playlist options"
          accessibilityRole="button"
          disabled={!props.canMutatePlaylists || props.isMutating}
          onPress={() => {
            setIsOptionsMenuVisible(true);
          }}
          style={({ pressed }) => [
            styles.compactIconButton,
            styles.topRightMenuButton,
            pressed && props.canMutatePlaylists && !props.isMutating
              ? styles.actionButtonPressed
              : undefined,
            !props.canMutatePlaylists || props.isMutating
              ? styles.actionButtonDisabled
              : undefined,
          ]}
        >
          <MaterialCommunityIcons
            color="#1f1c17"
            name="dots-vertical"
            size={18}
          />
        </Pressable>
      ) : null}

      {!props.isEditMode ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Playback controls</Text>
          <View style={styles.playbackActionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={
                props.isMutating || props.orderedPlaybackAction.disabled
              }
              onPress={props.onPlayOrderedPlaylist}
              style={({ pressed }) => [
                styles.fabButton,
                pressed &&
                !props.isMutating &&
                !props.orderedPlaybackAction.disabled
                  ? styles.actionButtonPressed
                  : undefined,
                props.isMutating || props.orderedPlaybackAction.disabled
                  ? styles.actionButtonDisabled
                  : undefined,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>
                ▶ {props.orderedPlaybackAction.label}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.editorBody}>
          Reorder this running order before saving. Destructive controls in edit
          mode only affect this playlist.
        </Text>
      )}

      <SavedPlaylistDetailItemsList
        currentPlaylistEntryId={props.currentPlaylistEntryId}
        detailEntries={props.detailEntries}
        getCurrentScrollOffsetY={props.getCurrentScrollOffsetY}
        getItemDetailLabel={props.getItemDetailLabel}
        isEditMode={props.isEditMode}
        isItemPlayable={props.isItemPlayable}
        isMutating={props.isMutating}
        onMoveItem={props.onMoveItem}
        onPlayPlaylistEntry={props.onPlayPlaylistEntry}
        onReorderDragActiveChange={props.onReorderDragActiveChange}
        onReorderDragMove={props.onReorderDragMove}
        onRemoveItem={props.onRemoveItem}
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
    </View>
  );
};
