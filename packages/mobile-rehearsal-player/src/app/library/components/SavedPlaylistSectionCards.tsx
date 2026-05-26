import {
  type Playlist,
  type RehearsalQueueMode,
  type RepeatMode,
} from '@org/audio-library-models';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  getPlaylistRepeatModeLabel,
  PLAYLIST_REPEAT_MODES,
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

export const SavedPlaylistDetailCard = (props: {
  canMutatePlaylists: boolean;
  detailSummary: SavedPlaylistDetailSummary | null;
  getItemDetailLabel: (entry: Playlist['items'][number]) => string;
  isMutating: boolean;
  orderedPlaybackAction: PlaylistPlaybackActionCopy;
  playlistRepeatMode: RepeatMode;
  renameIssue: PlaylistDraftIssue | null;
  renamePlaylistName: string;
  selectedQueueMode: RehearsalQueueMode | null;
  selectedPlaylist: Playlist | null;
  selectedPlaylistIssue: PlaylistDraftIssue | null;
  onCloseDetail: () => void;
  onDeletePlaylist: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onPlayOrderedPlaylist: () => void;
  onRemoveItem: (entryId: string) => void;
  onRenamePlaylist: () => void;
  onRenamePlaylistNameChange: (value: string) => void;
  onSelectRepeatMode: (repeatMode: RepeatMode) => void;
  onShufflePlayPlaylist: () => void;
  shufflePlaybackAction: PlaylistPlaybackActionCopy;
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
      <Text style={styles.eyebrow}>Playlist detail</Text>
      <Text style={styles.sectionTitle}>{detailSummary.title}</Text>
      <Text style={styles.sectionBody}>{detailSummary.metadataLabel}</Text>
      <Text style={styles.editorBody}>{detailSummary.body}</Text>
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

      <View style={styles.group}>
        <Text style={styles.groupTitle}>Playback</Text>
        <Text style={styles.editorBody}>
          Start this playlist in saved order or a one-session shuffle. Repeat
          applies to the active rehearsal queue.
        </Text>
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            disabled={props.isMutating || props.orderedPlaybackAction.disabled}
            onPress={props.onPlayOrderedPlaylist}
            style={({ pressed }) => [
              props.selectedQueueMode === 'ordered'
                ? styles.primaryButton
                : styles.secondaryButton,
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
            <Text
              style={
                props.selectedQueueMode === 'ordered'
                  ? styles.primaryButtonLabel
                  : styles.secondaryButtonLabel
              }
            >
              {props.orderedPlaybackAction.label}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={props.isMutating || props.shufflePlaybackAction.disabled}
            onPress={props.onShufflePlayPlaylist}
            style={({ pressed }) => [
              props.selectedQueueMode === 'shuffle'
                ? styles.primaryButton
                : styles.secondaryButton,
              pressed &&
              !props.isMutating &&
              !props.shufflePlaybackAction.disabled
                ? styles.actionButtonPressed
                : undefined,
              props.isMutating || props.shufflePlaybackAction.disabled
                ? styles.actionButtonDisabled
                : undefined,
            ]}
          >
            <Text
              style={
                props.selectedQueueMode === 'shuffle'
                  ? styles.primaryButtonLabel
                  : styles.secondaryButtonLabel
              }
            >
              {props.shufflePlaybackAction.label}
            </Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          {PLAYLIST_REPEAT_MODES.map((repeatMode) => {
            const isSelected = props.playlistRepeatMode === repeatMode;

            return (
              <Pressable
                accessibilityRole="button"
                key={repeatMode}
                disabled={props.isMutating}
                onPress={() => {
                  props.onSelectRepeatMode(repeatMode);
                }}
                style={({ pressed }) => [
                  isSelected ? styles.primaryButton : styles.secondaryButton,
                  pressed && !props.isMutating
                    ? styles.actionButtonPressed
                    : undefined,
                  props.isMutating ? styles.actionButtonDisabled : undefined,
                ]}
              >
                <Text
                  style={
                    isSelected
                      ? styles.primaryButtonLabel
                      : styles.secondaryButtonLabel
                  }
                >
                  {getPlaylistRepeatModeLabel(repeatMode)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupTitle}>
          Current items ({selectedPlaylist.items.length})
        </Text>
        {selectedPlaylist.items.length === 0 ? (
          <Text style={styles.emptyMessage}>
            This playlist is empty. Return to Library, add saved tracks or loops
            there, then come back here to review the running order.
          </Text>
        ) : (
          <View style={styles.groupItems}>
            {selectedPlaylist.items.map((entry, index) => {
              return (
                <View key={entry.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>
                    {index + 1}. {entry.title}
                  </Text>
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
                      <Text style={styles.secondaryButtonLabel}>Move up</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        props.isMutating ||
                        index === selectedPlaylist.items.length - 1
                      }
                      onPress={() => {
                        props.onMoveItem(index, index + 1);
                      }}
                      style={({ pressed }) => [
                        styles.secondaryButton,
                        pressed &&
                        !props.isMutating &&
                        index < selectedPlaylist.items.length - 1
                          ? styles.actionButtonPressed
                          : undefined,
                        props.isMutating ||
                        index === selectedPlaylist.items.length - 1
                          ? styles.actionButtonDisabled
                          : undefined,
                      ]}
                    >
                      <Text style={styles.secondaryButtonLabel}>Move down</Text>
                    </Pressable>
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
                      <Text style={styles.secondaryButtonLabel}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
};
