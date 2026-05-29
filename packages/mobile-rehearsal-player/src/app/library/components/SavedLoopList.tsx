import { type PlayableItem } from '@org/audio-library-models';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  getSavedLoopItemIssue,
  type SavedLoopCard,
  type SavedLoopIssue,
} from '../utils/saved-loop-view-model';
import type { SavedPlaylistLibraryActionCopy } from '../utils/saved-playlist-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../utils/saved-track-playback-view-model';

type SavedLoopListProps = {
  activePlayableItem: PlayableItem | null;
  canMutateLoops: boolean;
  isPlaybackPreparing: boolean;
  loopCards: SavedLoopCard[];
  loopIssue: SavedLoopIssue | null;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  playlistActionCopy: SavedPlaylistLibraryActionCopy;
  canQueueAsNext: boolean;
  addLoopToPlaylist: (loop: SavedLoopCard['loop']) => void;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  removeLoop: (loop: SavedLoopCard['loop']) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
};

const PRIMARY_ACTION_BACKGROUND = '#305c4d';
const PRIMARY_ACTION_TEXT = '#fff8ef';
const PRIMARY_TEXT = '#1f1c17';
const SECONDARY_TEXT = '#5f5647';

export const SavedLoopList = ({
  activePlayableItem,
  canMutateLoops,
  isPlaybackPreparing,
  loopCards,
  loopIssue,
  pendingLoopId,
  playbackIssue,
  playbackState,
  playlistActionCopy,
  canQueueAsNext,
  addLoopToPlaylist,
  queuePlayableItemNext,
  removeLoop,
  togglePlayableItemPlayback,
}: SavedLoopListProps) => {
  if (loopCards.length === 0) {
    return null;
  }

  return (
    <View style={styles.loopGroup}>
      <Text style={styles.loopGroupTitle}>
        Saved loops ({loopCards.length})
      </Text>

      {loopCards.map((loopCard) => {
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
              <Text style={styles.loopName}>{loopCard.loop.name}</Text>
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
                <Pressable
                  accessibilityRole="button"
                  disabled={playlistActionCopy.disabled}
                  onPress={() => {
                    addLoopToPlaylist(loopCard.loop);
                  }}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && !playlistActionCopy.disabled
                      ? styles.actionButtonPressed
                      : undefined,
                    playlistActionCopy.disabled
                      ? styles.actionButtonDisabled
                      : undefined,
                  ]}
                >
                  <Text style={styles.secondaryButtonLabel}>
                    {playlistActionCopy.label}
                  </Text>
                </Pressable>
                {canQueueAsNext && loopCard.playableItem ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      queuePlayableItemNext(loopCard.playableItem);
                    }}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      pressed ? styles.actionButtonPressed : undefined,
                    ]}
                  >
                    <Text style={styles.secondaryButtonLabel}>Play next</Text>
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

            <Text style={styles.loopMetadata}>{loopCard.metadataLabel}</Text>
            {loopMessage ? (
              <Text style={styles.loopMessage}>{loopMessage}</Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  loopGroup: {
    gap: 12,
  },
  loopGroupTitle: {
    color: PRIMARY_TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  loopCard: {
    gap: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 16,
    backgroundColor: '#fffdf8',
  },
  loopHeader: {
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
  },
  loopName: {
    color: PRIMARY_TEXT,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
  loopMetadata: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  loopMessage: {
    color: SECONDARY_TEXT,
    fontSize: 13,
    lineHeight: 18,
  },
  playButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: PRIMARY_ACTION_BACKGROUND,
  },
  playButtonLabel: {
    color: PRIMARY_ACTION_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 999,
    backgroundColor: '#fffdf8',
  },
  secondaryButtonLabel: {
    color: PRIMARY_TEXT,
    fontSize: 13,
    fontWeight: '700',
  },
  actionButtonPressed: {
    opacity: 0.88,
  },
  actionButtonDisabled: {
    opacity: 0.56,
  },
});
