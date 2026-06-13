import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type PlayableItem } from '@org/audio-library-models';
import { Pressable, Text, View } from 'react-native';

import { CompactPlayableRowShell } from '../../../../components/compact-playable-row-shell';
import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../../playback/utils/saved-track-playback-view-model';
import { SearchHighlightedText } from '../../../search/components/search-highlighted-text';
import { resolveSavedLoopRowActions } from '../../utils/saved-loop-row-actions';
import {
  getSavedLoopItemIssue,
  type SavedLoopCard,
  type SavedLoopIssue,
} from '../../utils/saved-loop-view-model';
import {
  SAVED_LOOP_PRIMARY_TEXT,
  savedLoopListStyles as styles,
} from '../saved-loop-list-styles';

type SavedLoopListRowProps = {
  activePlayableItem: PlayableItem | null;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  editingLoopId: string | null;
  highlightQuery: string | null;
  isOptionsVisible: boolean;
  isPlaybackPreparing: boolean;
  isPlaylistMutating: boolean;
  loopCard: SavedLoopCard;
  loopIssue: SavedLoopIssue | null;
  onCloseOptions: () => void;
  onEditLoop: (loop: SavedLoopCard['loop']) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onOpenOptions: () => void;
  onPlayLoopSeries?: (loopId: string) => void;
  onToggleCurrentPlayback?: () => void;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
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

export const SavedLoopListRow = ({
  activePlayableItem,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  editingLoopId,
  highlightQuery,
  isOptionsVisible,
  isPlaybackPreparing,
  isPlaylistMutating,
  loopCard,
  loopIssue,
  onCloseOptions,
  onEditLoop,
  onOpenLoopPlaylistSelector,
  onOpenOptions,
  onPlayLoopSeries,
  onToggleCurrentPlayback,
  pendingLoopId,
  playbackIssue,
  playbackState,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeLoop,
  togglePlayableItemPlayback,
}: SavedLoopListRowProps) => {
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
    canEditLoop: playableItem !== null,
    canMutateLoops,
    canMutatePlaylists,
    canQueueAsNext,
    hasPlayableItem: playableItem !== null,
    isEditingLoop: editingLoopId === loopCard.loop.id,
    itemName: loopCard.loop.name,
    isLoopActive: isPlaybackLoopActive,
    isLoopMutating: pendingLoopId !== null,
    isPendingRemoval: pendingLoopId === loopCard.loop.id,
    isPlaylistMutating,
    onEdit: () => {
      onEditLoop(loopCard.loop);
    },
    onOpenPlaylistSelector: () => {
      onCloseOptions();
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

      if (isPlaybackLoopActive && onToggleCurrentPlayback) {
        onToggleCurrentPlayback();
        return;
      }

      if (onPlayLoopSeries) {
        onPlayLoopSeries(loopCard.loop.id);
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
      ? getSavedTrackPlaybackItemIssue(playbackIssue, loopCard.playableItem)
      : undefined);
  const overflowTrigger =
    menuActions.length > 0 ? (
      <OverflowMenuTrigger
        accessibilityLabel="Loop options"
        onPress={onOpenOptions}
      />
    ) : null;

  return (
    <View>
      <CompactPlayableRowShell
        actions={inlineActions.map((action, index) => {
          if (action.iconName) {
            return (
              <Pressable
                accessibilityLabel={action.accessibilityLabel ?? action.label}
                accessibilityRole="button"
                accessibilityState={{
                  disabled: action.disabled,
                }}
                disabled={action.disabled}
                key={`${loopCard.loop.id}:${action.accessibilityLabel ?? action.label}:${index}`}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && !action.disabled
                    ? styles.actionButtonPressed
                    : undefined,
                  action.disabled ? styles.actionButtonDisabled : undefined,
                ]}
              >
                <MaterialCommunityIcons
                  color={SAVED_LOOP_PRIMARY_TEXT}
                  name={action.iconName}
                  size={18}
                />
              </Pressable>
            );
          }

          return (
            <Pressable
              accessibilityLabel={action.accessibilityLabel ?? action.label}
              accessibilityRole="button"
              disabled={action.disabled}
              key={`${loopCard.loop.id}:${action.accessibilityLabel ?? action.label}:${index}`}
              onPress={action.onPress}
              style={({ pressed }) => [
                getInlineActionButtonStyle(action.tone),
                pressed && !action.disabled
                  ? styles.actionButtonPressed
                  : undefined,
                action.disabled ? styles.actionButtonDisabled : undefined,
              ]}
            >
              <Text style={getInlineActionLabelStyle(action.tone)}>
                {action.label}
              </Text>
            </Pressable>
          );
        })}
        metadata={
          <SearchHighlightedText
            query={highlightQuery}
            style={styles.loopMetadata}
            text={loopCard.metadataLabel}
          />
        }
        message={
          loopMessage ? <Text style={styles.loopMessage}>{loopMessage}</Text> : null
        }
        overflowTrigger={overflowTrigger}
        style={styles.loopCard}
        title={
          <SearchHighlightedText
            query={highlightQuery}
            style={styles.loopName}
            text={loopCard.loop.name}
          />
        }
        variant="card"
      />
      <OptionsMenuSheet
        actions={menuActions.map((action, index) => {
          return {
            disabled: action.disabled,
            id: `loop:${loopCard.loop.id}:${index}`,
            label: action.label,
            onPress: () => {
              onCloseOptions();
              action.onPress();
            },
            tone: getMenuTone(action.tone),
          };
        })}
        isVisible={isOptionsVisible}
        onClose={onCloseOptions}
        title={loopCard.loop.name}
      />
    </View>
  );
};