import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { FeedbackCard } from '../../components/feedback-card';
import { savedPlaylistSectionStyles as styles } from '../../components/saved-playlist-section-styles';
import { SearchHighlightedText } from '../../search/components/search-highlighted-text';
import {
  getSavedPlaylistCardPlayAction,
  resolveSavedPlaylistCardRenameTarget,
  type SavedPlaylistCard,
} from '../utils/saved-playlist-card-view-model';
import type { PlaylistDraftIssue } from '../utils/saved-playlist-view-model';
import {
  PlaylistOptionsMenuSurface,
  PlaylistRenameDialog,
} from './playlist-rename-dialog';

export const SavedPlaylistIssueCard = ({
  issue,
}: {
  issue: PlaylistDraftIssue | null;
}) => {
  if (!issue) {
    return null;
  }

  return (
    <FeedbackCard
      message={issue.message}
      size="compact"
      title={issue.title}
      tone="error"
    />
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
              <OverflowMenuTrigger
                accessibilityLabel="Playlist options"
                disabled={!props.canMutatePlaylists || props.isMutating}
                onPress={() => {
                  setOptionsPlaylistId(playlistCard.playlist.id);
                }}
              />
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
                <CompactPlaybackAction
                  accessibilityLabel={playAction.accessibilityLabel}
                  disabled={playAction.disabled}
                  iconName="play"
                  onPress={() => {
                    props.onPlayPlaylist(playlistCard.playlist.id);
                  }}
                  variant="card"
                />
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

export { SavedPlaylistDetailCard } from './saved-playlist-detail-card';
