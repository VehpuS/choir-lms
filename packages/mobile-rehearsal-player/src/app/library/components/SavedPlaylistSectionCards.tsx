import { type NamedLoop, type Playlist } from '@org/audio-library-models';
import { Pressable, Text, TextInput, View } from 'react-native';

import type { DriveLibrarySource } from '../utils/drive-library-view-model';
import { formatDurationLabel } from '../utils/drive-library-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistCard,
} from '../utils/saved-playlist-view-model';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import {
  SAVED_PLAYLIST_PLACEHOLDER_TEXT,
  savedPlaylistSectionStyles as styles,
} from './saved-playlist-section-styles';

const formatLoopRangeLabel = (loop: Pick<NamedLoop, 'startMs' | 'endMs'>) => {
  const startLabel = formatDurationLabel(loop.startMs) ?? '0:00';
  const endLabel = formatDurationLabel(loop.endMs) ?? '0:00';

  return `${startLabel} to ${endLabel}`;
};

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
        Start with a name, then add saved tracks and loops below.
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

export const SavedPlaylistEditorCard = (props: {
  canMutatePlaylists: boolean;
  isMutating: boolean;
  renameIssue: PlaylistDraftIssue | null;
  renamePlaylistName: string;
  savedLoops: NamedLoop[];
  savedSources: DriveLibrarySource[];
  selectedPlaylist: Playlist | null;
  selectedPlaylistIssue: PlaylistDraftIssue | null;
  onAddLoop: (loop: NamedLoop) => void;
  onAddSource: (source: DriveLibrarySource) => void;
  onDeletePlaylist: () => void;
  onMoveItem: (fromIndex: number, toIndex: number) => void;
  onRemoveItem: (entryId: string) => void;
  onRenamePlaylist: () => void;
  onRenamePlaylistNameChange: (value: string) => void;
}) => {
  const { selectedPlaylist } = props;

  if (!selectedPlaylist) {
    return null;
  }

  return (
    <View style={styles.editorCard}>
      <Text style={styles.editorTitle}>Editing {selectedPlaylist.name}</Text>
      <Text style={styles.editorBody}>
        Rename the playlist, add saved tracks or loops, and adjust the order
        here before queue playback lands in the next slice.
      </Text>
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
        <Text style={styles.groupTitle}>
          Current items ({selectedPlaylist.items.length})
        </Text>
        {selectedPlaylist.items.length === 0 ? (
          <Text style={styles.emptyMessage}>
            This playlist is empty. Add saved tracks or loops below to build the
            running order.
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
                    {entry.description ??
                      (entry.kind === 'loop' ? 'Saved loop' : 'Saved track')}
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

      <DriveLibrarySourceGroup
        getAction={(source) => {
          return {
            disabled: !props.canMutatePlaylists || props.isMutating,
            label: 'Add to playlist',
            onPress: () => {
              props.onAddSource(source);
            },
          };
        }}
        sources={props.savedSources}
        title={`Add saved tracks (${props.savedSources.length})`}
      />

      {props.savedLoops.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>
            Add saved loops ({props.savedLoops.length})
          </Text>
          <View style={styles.groupItems}>
            {props.savedLoops.map((loop) => {
              return (
                <View key={loop.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{loop.name}</Text>
                  <Text style={styles.itemMetadata}>
                    {loop.sourceName} • {formatLoopRangeLabel(loop)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!props.canMutatePlaylists || props.isMutating}
                    onPress={() => {
                      props.onAddLoop(loop);
                    }}
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
                    <Text style={styles.secondaryButtonLabel}>
                      Add to playlist
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
};
