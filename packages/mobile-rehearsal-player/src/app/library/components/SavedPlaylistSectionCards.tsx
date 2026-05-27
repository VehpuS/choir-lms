import {
  type Playlist,
} from '@org/audio-library-models';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { SavedPlaylistDetailRemovalNotice } from '../utils/saved-playlist-detail-view-model';
import {
  type PlaylistPlaybackActionCopy,
} from '../utils/saved-playlist-playback-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistCard,
  SavedPlaylistDetailSummary,
} from '../utils/saved-playlist-view-model';
import {
  SAVED_PLAYLIST_PLACEHOLDER_TEXT,
  savedPlaylistSectionStyles as styles,
} from './saved-playlist-section-styles';

type PlaylistEntry = Playlist['items'][number];

export const SavedPlaylistIssueCard = ({
  issue,
}: {
  issue: PlaylistDraftIssue | null;
}) => {
  if (!issue) {
    return null;
  }

  return (
    <View style={styles.issueCard}>
      <Text style={styles.issueTitle}>{issue.title}</Text>
      <Text style={styles.issueMessage}>{issue.message}</Text>
    </View>
  );
};

export const SavedPlaylistCreateCard = (props: {
  canMutatePlaylists: boolean;
  createPlaylistName: string;
  creationIssue: PlaylistDraftIssue | null;
  isMutating: boolean;
  onCreatePlaylist: () => void;
  onCreatePlaylistNameChange: (value: string) => void;
}) => {
  return (
    <View style={styles.editorCard}>
      <Text style={styles.editorTitle}>Create playlist</Text>
      <Text style={styles.editorBody}>
        Start with a name, then select it as the active destination before
        adding saved tracks and loops from Library.
      </Text>
      <TextInput
        autoCorrect={false}
        onChangeText={props.onCreatePlaylistNameChange}
        placeholder="Name this rehearsal set"
        placeholderTextColor={SAVED_PLAYLIST_PLACEHOLDER_TEXT}
        returnKeyType="done"
        style={styles.nameInput}
        value={props.createPlaylistName}
      />
      <SavedPlaylistIssueCard issue={props.creationIssue} />
      <Pressable
        accessibilityRole="button"
        disabled={!props.canMutatePlaylists || props.isMutating}
        onPress={props.onCreatePlaylist}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && props.canMutatePlaylists && !props.isMutating
            ? styles.actionButtonPressed
            : undefined,
          !props.canMutatePlaylists || props.isMutating
            ? styles.actionButtonDisabled
            : undefined,
        ]}
      >
        <Text style={styles.primaryButtonLabel}>
          {props.isMutating ? 'Saving playlist…' : 'Create playlist'}
        </Text>
      </Pressable>
    </View>
  );
};

export const SavedPlaylistCardsList = (props: {
  playlistCards: SavedPlaylistCard[];
  selectedPlaylistId: string | null;
  onSelectPlaylist: (playlistId: string) => void;
}) => {
  if (props.playlistCards.length === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        Playlists ({props.playlistCards.length})
      </Text>
      <View style={styles.groupItems}>
        {props.playlistCards.map((playlistCard) => {
          const isSelected =
            playlistCard.playlist.id === props.selectedPlaylistId;

          return (
            <Pressable
              accessibilityRole="button"
              key={playlistCard.playlist.id}
              onPress={() => {
                props.onSelectPlaylist(playlistCard.playlist.id);
              }}
              style={({ pressed }) => [
                styles.playlistCard,
                isSelected ? styles.playlistCardSelected : undefined,
                pressed ? styles.actionButtonPressed : undefined,
              ]}
            >
              <Text style={styles.playlistName}>
                {playlistCard.playlist.name}
              </Text>
              <Text style={styles.playlistMetadata}>
                {playlistCard.detailLabel}
              </Text>
              <Text style={styles.playlistPreview}>
                {playlistCard.previewLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const getRowStatusLabel = (options: {
  isCurrentEntry: boolean;
  isPlayable: boolean;
}) => {
  if (options.isCurrentEntry) {
    return 'Playing';
  }

  if (options.isPlayable) {
    return 'Tap to play';
  }

  return 'Unavailable';
};

export const SavedPlaylistDetailCard = (props: {
  canMutatePlaylists: boolean;
  currentPlaylistEntryId: string | null;
  detailSummary: SavedPlaylistDetailSummary | null;
  detailEntries: PlaylistEntry[];
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
  onToggleEditMode: () => void;
  onUndoRemoveItem: () => void;
}) => {
  const { detailSummary, selectedPlaylist } = props;

  if (!selectedPlaylist || !detailSummary) {
    return null;
  }

  return (
    <View style={styles.editorCard}>
      <Pressable
        accessibilityRole="button"
        onPress={props.onCloseDetail}
        style={({ pressed }) => [
          styles.secondaryButton,
          pressed ? styles.actionButtonPressed : undefined,
        ]}
      >
        <Text style={styles.secondaryButtonLabel}>Back to Library</Text>
      </Pressable>

      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Playlist detail</Text>
          <Text style={styles.sectionTitle}>{detailSummary.title}</Text>
          <Text style={styles.sectionBody}>{detailSummary.metadataLabel}</Text>
          <Text style={styles.editorBody}>{detailSummary.body}</Text>
        </View>
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
            {props.isEditMode ? 'Save' : 'Edit'}
          </Text>
        </Pressable>
      </View>

      {!props.isEditMode ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Playback</Text>
          <Text style={styles.editorBody}>
            Start this playlist in saved order, or tap a row to jump into the
            queue from that saved position.
          </Text>
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
                {props.orderedPlaybackAction.label}
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

      <View style={styles.group}>
        <Text style={styles.groupTitle}>
          {props.isEditMode ? 'Edit items' : 'Current items'} (
          {props.detailEntries.length})
        </Text>
        {props.detailEntries.length === 0 ? (
          <Text style={styles.emptyMessage}>
            This playlist is empty. Return to Library, add saved tracks or loops
            there, then come back here to review the running order.
          </Text>
        ) : (
          <View style={styles.groupItems}>
            {props.detailEntries.map((entry, index) => {
              const isCurrentEntry = props.currentPlaylistEntryId === entry.id;
              const isPlayable = props.isItemPlayable(entry);

              return (
                <View
                  key={entry.id}
                  style={[
                    styles.itemCard,
                    isCurrentEntry ? styles.itemCardActive : undefined,
                    !isPlayable ? styles.itemCardUnavailable : undefined,
                  ]}
                >
                  {props.isEditMode ? (
                    <>
                      <View style={styles.itemHeaderRow}>
                        <Text style={styles.itemTitle}>
                          {index + 1}. {entry.title}
                        </Text>
                        <Text style={styles.dragHandleLabel}>|||</Text>
                      </View>
                      <Text style={styles.itemMetadata}>
                        {props.getItemDetailLabel(entry)}
                      </Text>
                      <View style={styles.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={props.isMutating || index === 0}
                          onPress={() => {
                            props.onMoveItem(index, index - 1);
                          }}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && !props.isMutating && index > 0
                              ? styles.actionButtonPressed
                              : undefined,
                            props.isMutating || index === 0
                              ? styles.actionButtonDisabled
                              : undefined,
                          ]}
                        >
                          <Text style={styles.secondaryButtonLabel}>
                            Move up
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={
                            props.isMutating ||
                            index === props.detailEntries.length - 1
                          }
                          onPress={() => {
                            props.onMoveItem(index, index + 1);
                          }}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed &&
                            !props.isMutating &&
                            index < props.detailEntries.length - 1
                              ? styles.actionButtonPressed
                              : undefined,
                            props.isMutating ||
                            index === props.detailEntries.length - 1
                              ? styles.actionButtonDisabled
                              : undefined,
                          ]}
                        >
                          <Text style={styles.secondaryButtonLabel}>
                            Move down
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={props.isMutating}
                          onPress={() => {
                            props.onRemoveItem(entry.id);
                          }}
                          style={({ pressed }) => [
                            styles.destructiveButton,
                            pressed && !props.isMutating
                              ? styles.actionButtonPressed
                              : undefined,
                            props.isMutating
                              ? styles.actionButtonDisabled
                              : undefined,
                          ]}
                        >
                          <Text style={styles.destructiveButtonLabel}>
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        disabled={props.isMutating || !isPlayable}
                        onPress={() => {
                          props.onPlayPlaylistEntry(entry.id);
                        }}
                        style={({ pressed }) => [
                          styles.itemPressable,
                          pressed && !props.isMutating && isPlayable
                            ? styles.actionButtonPressed
                            : undefined,
                        ]}
                      >
                        <View style={styles.itemHeaderRow}>
                          <Text style={styles.itemTitle}>
                            {index + 1}. {entry.title}
                          </Text>
                          <Text
                            style={
                              isCurrentEntry
                                ? styles.itemStatusActive
                                : isPlayable
                                  ? styles.itemStatusReady
                                  : styles.itemStatusUnavailable
                            }
                          >
                            {getRowStatusLabel({
                              isCurrentEntry,
                              isPlayable,
                            })}
                          </Text>
                        </View>
                        <Text style={styles.itemMetadata}>
                          {props.getItemDetailLabel(entry)}
                        </Text>
                      </Pressable>
                      <View style={styles.actionRow}>
                        <Pressable
                          accessibilityRole="button"
                          disabled={props.isMutating}
                          onPress={() => {
                            props.onRemoveItem(entry.id);
                          }}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && !props.isMutating
                              ? styles.actionButtonPressed
                              : undefined,
                            props.isMutating
                              ? styles.actionButtonDisabled
                              : undefined,
                          ]}
                        >
                          <Text style={styles.secondaryButtonLabel}>
                            Remove
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {!props.isEditMode ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Manage playlist</Text>
          <TextInput
            autoCorrect={false}
            onChangeText={props.onRenamePlaylistNameChange}
            placeholder="Rename this playlist"
            placeholderTextColor={SAVED_PLAYLIST_PLACEHOLDER_TEXT}
            returnKeyType="done"
            style={styles.nameInput}
            value={props.renamePlaylistName}
          />
          <SavedPlaylistIssueCard
            issue={props.renameIssue ?? props.selectedPlaylistIssue}
          />
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              disabled={!props.canMutatePlaylists || props.isMutating}
              onPress={props.onRenamePlaylist}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && props.canMutatePlaylists && !props.isMutating
                  ? styles.actionButtonPressed
                  : undefined,
                !props.canMutatePlaylists || props.isMutating
                  ? styles.actionButtonDisabled
                  : undefined,
              ]}
            >
              <Text style={styles.primaryButtonLabel}>Save name</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!props.canMutatePlaylists || props.isMutating}
              onPress={props.onDeletePlaylist}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && props.canMutatePlaylists && !props.isMutating
                  ? styles.actionButtonPressed
                  : undefined,
                !props.canMutatePlaylists || props.isMutating
                  ? styles.actionButtonDisabled
                  : undefined,
              ]}
            >
              <Text style={styles.secondaryButtonLabel}>Remove playlist</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {props.removalNotice ? (
        <View style={styles.snackbarCard}>
          <Text style={styles.snackbarMessage}>
            {props.removalNotice.entry.title} removed from {detailSummary.title}
            .
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
      ) : null}
    </View>
  );
};
