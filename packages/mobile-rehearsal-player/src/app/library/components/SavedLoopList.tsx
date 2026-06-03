import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type PlayableItem } from '@org/audio-library-models';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import {
  getSavedLoopItemIssue,
  type SavedLoopCard,
  type SavedLoopIssue,
} from '../utils/saved-loop-view-model';
import { resolveSavedLoopRowActions } from '../utils/saved-loop-row-actions';
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

const getInlineActionButtonStyle = (
  tone?: 'destructive' | 'neutral' | 'primary',
) => {
  return tone === 'primary' ? styles.playButton : styles.secondaryButton;
};

const getInlineActionLabelStyle = (
  tone?: 'destructive' | 'neutral' | 'primary',
) => {
  return tone === 'primary'
    ? styles.playButtonLabel
    : styles.secondaryButtonLabel;
};

const getMenuTone = (tone?: 'destructive' | 'neutral' | 'primary') => {
  if (tone === 'primary') {
    return 'primary' as const;
  }

  if (tone === 'destructive') {
    return 'destructive' as const;
  }

  return 'secondary' as const;
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
        const rowActions = resolveSavedLoopRowActions({
          canMutateLoops,
          canMutatePlaylists,
          canQueueAsNext,
          hasPlayableItem: playableItem !== null,
          isLoopActive: isPlaybackLoopActive,
          isLoopMutating: pendingLoopId !== null,
          isPendingRemoval: pendingLoopId === loopCard.loop.id,
          isPlaylistMutating,
          onOpenPlaylistSelector: () => {
            setActiveOptionsLoopId(null);
            onOpenLoopPlaylistSelector(loopCard.loop.id);
          },
          onQueueNext: () => {
            if (!playableItem) {
              return;
            }

            queuePlayableItemNext(playableItem);
          },
          onQueueUpNext: () => {
            if (!playableItem) {
              return;
            }

            queuePlayableItemUpNext(playableItem);
          },
          onRemove: () => {
            removeLoop(loopCard.loop);
          },
          onTogglePlayback: () => {
            if (!loopCard.playableItem) {
              return;
            }

            void togglePlayableItemPlayback(loopCard.playableItem);
          },
          playbackAction,
        });
        const inlineActions = rowActions.filter((action) => {
          return action.placement === 'inline';
        });
        const menuActions = rowActions.filter((action) => {
          return action.placement === 'menu';
        });
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
                {menuActions.length > 0 ? (
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
                ) : null}
              </View>
              <View style={styles.actionRow}>
                {inlineActions.map((action, index) => {
                  return (
                    <Pressable
                      accessibilityLabel={
                        action.accessibilityLabel ?? action.label
                      }
                      accessibilityRole="button"
                      disabled={action.disabled}
                      key={`${loopCard.loop.id}:${action.accessibilityLabel ?? action.label}:${index}`}
                      onPress={action.onPress}
                      style={({ pressed }) => [
                        getInlineActionButtonStyle(action.tone),
                        pressed && !action.disabled
                          ? styles.actionButtonPressed
                          : undefined,
                        action.disabled
                          ? styles.actionButtonDisabled
                          : undefined,
                      ]}
                    >
                      <Text style={getInlineActionLabelStyle(action.tone)}>
                        {action.label}
                      </Text>
                    </Pressable>
                  );
                })}
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
              actions={menuActions.map((action, index) => {
                return {
                  disabled: action.disabled,
                  id: `loop:${loopCard.loop.id}:${index}`,
                  label: action.label,
                  onPress: () => {
                    setActiveOptionsLoopId(null);
                    action.onPress();
                  },
                  tone: getMenuTone(action.tone),
                };
              })}
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
