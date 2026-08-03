import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CompactPlaybackAction } from '../../../components/compact-playback-action';
import { OverflowMenuTrigger } from '../../../components/overflow-menu-trigger';
import { appTheme } from '../../../utils/theme';
import {
  ExplorerListRow,
  ExplorerListSurface,
} from '../../components/explorer';
import { FeedbackCard } from '../../components/feedback-card';
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
  onAddItemsToPlaylist?: (playlistId: string) => void;
  onBeginRenamePlaylist: (playlistId: string) => void;
  onCancelRenamePlaylist: () => void;
  onDeletePlaylist: (playlistId: string) => void;
  onEditPlaylistTags: (playlistId: string) => void;
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
    <View style={styles.surface}>
      <Text style={styles.listTitle}>
        Playlists ({props.playlistCards.length})
      </Text>
      <ExplorerListSurface>
        {props.playlistCards.map((playlistCard) => {
          const playAction = getSavedPlaylistCardPlayAction(
            playlistCard.playlist,
          );

          return (
            <View key={playlistCard.playlist.id}>
              <ExplorerListRow
                actions={
                  <CompactPlaybackAction
                    accessibilityLabel={playAction.accessibilityLabel}
                    disabled={playAction.disabled}
                    iconName="play"
                    onPress={() => {
                      props.onPlayPlaylist(playlistCard.playlist.id);
                    }}
                    variant="row"
                  />
                }
                leadingIcon={
                  <MaterialCommunityIcons
                    color={appTheme.colors.secondaryText}
                    name="playlist-music-outline"
                    size={22}
                  />
                }
                message={
                  <Text numberOfLines={1} style={styles.rowPreviewLabel}>
                    {playlistCard.previewLabel}
                  </Text>
                }
                metadata={
                  <Text numberOfLines={1} style={styles.rowSupportingLabel}>
                    {playlistCard.detailLabel}
                  </Text>
                }
                onPress={() => {
                  props.onSelectPlaylist(playlistCard.playlist.id);
                }}
                overflowTrigger={
                  <OverflowMenuTrigger
                    accessibilityLabel={`${playlistCard.playlist.name} options`}
                    disabled={!props.canMutatePlaylists || props.isMutating}
                    iconColor={appTheme.colors.secondaryText}
                    onPress={() => {
                      setOptionsPlaylistId(playlistCard.playlist.id);
                    }}
                    style={styles.rowOverflowTrigger}
                  />
                }
                title={
                  <SearchHighlightedText
                    numberOfLines={1}
                    query={props.highlightQuery ?? null}
                    style={styles.rowTitle}
                    text={playlistCard.playlist.name}
                  />
                }
              />
            </View>
          );
        })}
      </ExplorerListSurface>
      <PlaylistOptionsMenuSurface
        isMutating={props.isMutating || !props.canMutatePlaylists}
        isVisible={selectedOptionsPlaylist !== undefined}
        onAddItems={() => {
          if (!selectedOptionsPlaylist || !props.onAddItemsToPlaylist) {
            return;
          }

          setOptionsPlaylistId(null);
          props.onAddItemsToPlaylist(selectedOptionsPlaylist.playlist.id);
        }}
        onClose={() => {
          setOptionsPlaylistId(null);
        }}
        onEditTags={() => {
          if (!selectedOptionsPlaylist) {
            return;
          }

          setOptionsPlaylistId(null);
          props.onEditPlaylistTags(selectedOptionsPlaylist.playlist.id);
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

const styles = StyleSheet.create({
  listTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 18,
    fontWeight: '700',
  },
  rowOverflowTrigger: {
    position: 'relative',
    top: 0,
    right: 0,
  },
  rowPreviewLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 12,
    lineHeight: 17,
  },
  rowSupportingLabel: {
    color: appTheme.colors.secondaryText,
    fontSize: 13,
    lineHeight: 18,
  },
  rowTitle: {
    color: appTheme.colors.primaryText,
    fontSize: 15,
    fontWeight: '700',
  },
  surface: {
    gap: 12,
  },
});
