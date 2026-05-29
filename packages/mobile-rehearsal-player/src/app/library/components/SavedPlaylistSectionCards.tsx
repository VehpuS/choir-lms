import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { queueSavedPlaylistRenameRequest } from '../utils/saved-playlist-detail-view-model';
import type {
  PlaylistDraftIssue,
  SavedPlaylistCard,
} from '../utils/saved-playlist-view-model';
import { PlaylistOptionsMenuSurface } from './PlaylistRenameDialog';
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
  playlistCards: SavedPlaylistCard[];
  selectedPlaylistId?: string | null;
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

  return (
    <View style={styles.group}>
      <Text style={styles.groupTitle}>
        Playlists ({props.playlistCards.length})
      </Text>
      <View style={styles.groupItems}>
        {props.playlistCards.map((playlistCard) => {
          return (
            <View key={playlistCard.playlist.id} style={styles.playlistCard}>
              <Pressable
                accessibilityLabel="Playlist options"
                accessibilityRole="button"
                onPress={() => {
                  setOptionsPlaylistId(playlistCard.playlist.id);
                }}
                style={({ pressed }) => [
                  styles.compactIconButton,
                  styles.topRightMenuButton,
                  pressed ? styles.actionButtonPressed : undefined,
                ]}
              >
                <MaterialCommunityIcons
                  color="#1f1c17"
                  name="dots-vertical"
                  size={18}
                />
              </Pressable>
              <Text style={styles.playlistName}>{playlistCard.playlist.name}</Text>
              <Text numberOfLines={1} style={styles.playlistMetadata}>
                {playlistCard.detailLabel}
              </Text>
              <Text numberOfLines={1} style={styles.playlistPreview}>
                {playlistCard.previewLabel}
              </Text>
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
          );
        })}
      </View>
      <PlaylistOptionsMenuSurface
        isMutating={false}
        isVisible={selectedOptionsPlaylist !== undefined}
        onClose={() => {
          setOptionsPlaylistId(null);
        }}
        onRename={() => {
          if (!selectedOptionsPlaylist) {
            return;
          }

          queueSavedPlaylistRenameRequest(selectedOptionsPlaylist.playlist.id);
          setOptionsPlaylistId(null);
          props.onSelectPlaylist(selectedOptionsPlaylist.playlist.id);
        }}
        playlistName={selectedOptionsPlaylist?.playlist.name ?? ''}
      />
    </View>
  );
};

export { SavedPlaylistDetailCard } from './SavedPlaylistDetailCard';
