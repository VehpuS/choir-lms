import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import {
  getSavedPlaylistCardPlayAction,
  resolveSavedPlaylistCardRenameTarget,
} from '../utils/saved-playlist-card-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistCard,
} from '../utils/saved-playlist-view-model';
import {
  PlaylistOptionsMenuSurface,
  PlaylistRenameDialog,
} from './PlaylistRenameDialog';
import { SearchHighlightedText } from './SearchHighlightedText';
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
  cardRenameIssue: PlaylistDraftIssue | null;
  cardRenamePlaylistId: string | null;
  cardRenamePlaylistName: string;
  canMutatePlaylists: boolean;
  highlightQuery?: string | null;
  isMutating: boolean;
  onBeginRenamePlaylist: (playlistId: string) => void;
  onCancelRenamePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  onRenamePlaylistNameChange: (value: string) => void;
  onSubmitRenamePlaylist: () => void;
  playlistCards: SavedPlaylistCard[];
  selectedPlaylistId?: string | null;
  onPlayPlaylist: (playlistId: string) => void;
  onSelectPlaylist: (playlistId: string) => void;
}) => {
  const [optionsPlaylistId, setOptionsPlaylistId] = useState<string | null>(
    null,
  );

  if (props.playlistCards.length === 0) {
    return null;
  }

  const selectedOptionsPlaylist = props.playlistCards.find((playlistCard) => {
    return playlistCard.playlist.id === optionsPlaylistId;
  });
  const selectedCardRenameTarget = resolveSavedPlaylistCardRenameTarget(
    props.playlistCards,
    props.cardRenamePlaylistId,
  );

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        Playlists ({props.playlistCards.length})
      </Text>
      <View style={styles.groupItems}>
        {props.playlistCards.map((playlistCard) => {
          const playAction = getSavedPlaylistCardPlayAction(
            playlistCard.playlist,
          );

          return (
            <View key={playlistCard.playlist.id} style={styles.playlistCard}>
              <Pressable
                accessibilityLabel="Playlist options"
                accessibilityRole="button"
                disabled={!props.canMutatePlaylists || props.isMutating}
                onPress={() => {
                  setOptionsPlaylistId(playlistCard.playlist.id);
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
              <SearchHighlightedText
                query={props.highlightQuery ?? null}
                style={styles.playlistName}
                text={playlistCard.playlist.name}
              />
              <Text numberOfLines={1} style={styles.playlistMetadata}>
                {playlistCard.detailLabel}
              </Text>
              <Text numberOfLines={1} style={styles.playlistPreview}>
                {playlistCard.previewLabel}
              </Text>
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityLabel={playAction.accessibilityLabel}
                  accessibilityRole="button"
                  disabled={playAction.disabled}
                  onPress={() => {
                    props.onPlayPlaylist(playlistCard.playlist.id);
                  }}
                  style={({ pressed }) => [
                    styles.compactIconButton,
                    pressed && !playAction.disabled
                      ? styles.actionButtonPressed
                      : undefined,
                    playAction.disabled
                      ? styles.actionButtonDisabled
                      : undefined,
                  ]}
                >
                  <MaterialCommunityIcons
                    color="#1f1c17"
                    name="play"
                    size={18}
                  />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    props.onSelectPlaylist(playlistCard.playlist.id);
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed ? styles.actionButtonPressed : undefined,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>Open playlist</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
      <PlaylistOptionsMenuSurface
        isMutating={props.isMutating || !props.canMutatePlaylists}
        isVisible={selectedOptionsPlaylist !== undefined}
        onClose={() => {
          setOptionsPlaylistId(null);
        }}
        onRemove={() => {
          if (!selectedOptionsPlaylist) {
            return;
          }

          setOptionsPlaylistId(null);
          props.onDeletePlaylist(selectedOptionsPlaylist.playlist.id);
        }}
        onRename={() => {
          if (!selectedOptionsPlaylist) {
            return;
          }

          setOptionsPlaylistId(null);
          props.onBeginRenamePlaylist(selectedOptionsPlaylist.playlist.id);
        }}
        playlistName={selectedOptionsPlaylist?.playlist.name ?? ''}
      />
      <PlaylistRenameDialog
        isMutating={props.isMutating}
        isVisible={selectedCardRenameTarget !== null}
        issue={props.cardRenameIssue}
        onCancel={props.onCancelRenamePlaylist}
        onChange={props.onRenamePlaylistNameChange}
        onSubmit={props.onSubmitRenamePlaylist}
        playlistName={selectedCardRenameTarget?.playlistName ?? ''}
        value={props.cardRenamePlaylistName}
      />
    </View>
  );
};

export { SavedPlaylistDetailCard } from './SavedPlaylistDetailCard';
