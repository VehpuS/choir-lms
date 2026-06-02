import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type PlayableItem } from '@org/audio-library-models';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  getSavedLoopItemIssue,
  type SavedLoopCard,
  type SavedLoopIssue,
} from '../utils/saved-loop-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';
import { OptionsMenuSheet } from './OptionsMenuSheet';
import { SearchHighlightedText } from './SearchHighlightedText';
import {
  SAVED_LOOP_PRIMARY_TEXT,
  savedLoopListStyles as styles,
} from './saved-loop-list-styles';

type SavedLoopListProps = {
  activePlayableItem: PlayableItem | null;
  canMutateLoops: boolean;
  isPlaybackPreparing: boolean;
  highlightQuery: string | null;
  loopCards: SavedLoopCard[];
  loopIssue: SavedLoopIssue | null;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  canMutatePlaylists: boolean;
  isPlaylistMutating: boolean;
  canQueueAsNext: boolean;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  queuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  removeLoop: (loop: SavedLoopCard['loop']) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
};

export const SavedLoopList = ({
  activePlayableItem,
  canMutateLoops,
  isPlaybackPreparing,
  highlightQuery,
  loopCards,
  loopIssue,
  pendingLoopId,
  playbackIssue,
  playbackState,
  canMutatePlaylists,
  isPlaylistMutating,
  canQueueAsNext,
  onOpenLoopPlaylistSelector,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeLoop,
  togglePlayableItemPlayback,
}: SavedLoopListProps) => {
  const [activeOptionsLoopId, setActiveOptionsLoopId] = useState<string | null>(
    null,
  );

  if (loopCards.length === 0) {
    return null;
  }

  return (
    <View style={styles.loopGroup}>
      <Text style={styles.loopGroupTitle}>
        Saved loops ({loopCards.length})
      </Text>

      {loopCards.map((loopCard) => {
        const playableItem = loopCard.playableItem;
        const playbackAction = loopCard.playableItem
          ? getSavedTrackPlaybackActionCopy({
              activePlayableItem,
              isPreparing: isPlaybackPreparing,
              playableItem: loopCard.playableItem,
              playbackState,
            })
          : {
              disabled: true,
              label: 'Unavailable',
            };
        const isPlaybackLoopActive =
          loopCard.playableItem !== null &&
          isSavedTrackPlaybackActive(activePlayableItem, loopCard.playableItem);
        const loopMessage =
          getSavedLoopItemIssue(loopIssue, loopCard.loop.id) ??
          loopCard.message ??
          (loopCard.playableItem
            ? getSavedTrackPlaybackItemIssue(
                playbackIssue,
                loopCard.playableItem,
              )
            : undefined);

        return (
          <View key={loopCard.loop.id} style={styles.loopCard}>
            <View style={styles.loopHeader}>
              <View style={styles.loopTitleRow}>
                <SearchHighlightedText
                  query={highlightQuery}
                  style={styles.loopName}
                  text={loopCard.loop.name}
                />
                <Pressable
                  accessibilityLabel="Loop options"
                  accessibilityRole="button"
                  onPress={() => {
                    setActiveOptionsLoopId(loopCard.loop.id);
                  }}
                  style={({ pressed }) => [
                    styles.iconButton,
                    pressed ? styles.actionButtonPressed : undefined,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={SAVED_LOOP_PRIMARY_TEXT}
                    name="dots-vertical"
                    size={18}
                  />
                </Pressable>
              </View>
              <View style={styles.actionRow}>
                <Pressable
                  accessibilityRole="button"
                  disabled={playbackAction.disabled}
                  onPress={() => {
                    if (!loopCard.playableItem) {
                      return;
                    }

                    void togglePlayableItemPlayback(loopCard.playableItem);
                  }}
                  style={({ pressed }) => [
                    styles.playButton,
                    pressed && !playbackAction.disabled
                      ? styles.actionButtonPressed
                      : undefined,
                    playbackAction.disabled
                      ? styles.actionButtonDisabled
                      : undefined,
                  ]}
                >
                  <Text style={styles.playButtonLabel}>
                    {playbackAction.label}
                  </Text>
                </Pressable>
                {canQueueAsNext && playableItem ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      queuePlayableItemNext(playableItem);
                    }}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.actionButtonPressed : undefined,
                    ]}
                  >
                    <Text style={styles.secondaryButtonLabel}>Play next</Text>
                  </Pressable>
                ) : null}
                {canQueueAsNext && playableItem ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      queuePlayableItemUpNext(playableItem);
                    }}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.actionButtonPressed : undefined,
                    ]}
                  >
                    <Text style={styles.secondaryButtonLabel}>
                      Add to queue
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  disabled={
                    !canMutateLoops ||
                    pendingLoopId !== null ||
                    isPlaybackLoopActive
                  }
                  onPress={() => {
                    removeLoop(loopCard.loop);
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed &&
                    canMutateLoops &&
                    pendingLoopId === null &&
                    !isPlaybackLoopActive
                      ? styles.actionButtonPressed
                      : undefined,
                    !canMutateLoops ||
                    pendingLoopId !== null ||
                    isPlaybackLoopActive
                      ? styles.actionButtonDisabled
                      : undefined,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>
                    {pendingLoopId === loopCard.loop.id
                      ? 'Removing…'
                      : 'Remove'}
                  </Text>
                </Pressable>
              </View>
            </View>

            <SearchHighlightedText
              query={highlightQuery}
              style={styles.loopMetadata}
              text={loopCard.metadataLabel}
            />
            {loopMessage ? (
              <Text style={styles.loopMessage}>{loopMessage}</Text>
            ) : null}
            <OptionsMenuSheet
              actions={[
                {
                  disabled: !canMutatePlaylists || isPlaylistMutating,
                  id: `loop:${loopCard.loop.id}:add-to-playlist`,
                  label: !canMutatePlaylists
                    ? 'Playlists unavailable'
                    : isPlaylistMutating
                      ? 'Updating playlist…'
                      : 'Add to playlist',
                  onPress: () => {
                    setActiveOptionsLoopId(null);
                    onOpenLoopPlaylistSelector(loopCard.loop.id);
                  },
                  tone: 'primary',
                },
              ]}
              isVisible={activeOptionsLoopId === loopCard.loop.id}
              onClose={() => {
                setActiveOptionsLoopId(null);
              }}
              title={loopCard.loop.name}
            />
          </View>
        );
      })}
    </View>
  );
};
