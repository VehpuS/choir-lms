import { MaterialCommunityIcons } from '@expo/vector-icons';
import { type PlayableItem } from '@org/audio-library-models';
import { StyleSheet, Text } from 'react-native';

import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import { appTheme } from '../../../../utils/theme';
import { ExplorerListRow } from '../../../components/explorer';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import { attachRowActionSections } from '../../../components/options-menu-sheet/row-action-sections';
import { toOptionsMenuAction } from '../../../components/saved-rehearsal-library-section/files-row-actions-contract';
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
  onEditLoopTags: (loop: SavedLoopCard['loop']) => void;
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
  onEditLoopTags,
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
  const playbackAction = playableItem
    ? getSavedTrackPlaybackActionCopy({
        activePlayableItem,
        isPreparing: isPlaybackPreparing,
        playableItem,
        playbackState,
      })
    : {
        disabled: true,
        label: 'Unavailable',
      };
  const isPlaybackLoopActive =
    playableItem !== null &&
    isSavedTrackPlaybackActive(activePlayableItem, playableItem);
  const handleTogglePlayback = () => {
    if (!playableItem) {
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

    void togglePlayableItemPlayback(playableItem);
  };
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
    onEditTags: () => {
      onCloseOptions();
      onEditLoopTags(loopCard.loop);
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
    onTogglePlayback: handleTogglePlayback,
    playbackAction,
  });
  const menuActions = rowActions.filter((action) => {
    return action.placement === 'menu';
  });
  const sheetActions = attachRowActionSections(
    menuActions.map((action, index) => {
      return toOptionsMenuAction({
        action,
        id: `loop:${loopCard.loop.id}:${index}`,
      });
    }),
  );
  const loopMessage =
    getSavedLoopItemIssue(loopIssue, loopCard.loop.id) ??
    loopCard.message ??
    (playableItem
      ? getSavedTrackPlaybackItemIssue(playbackIssue, playableItem)
      : undefined);

  return (
    <>
      <ExplorerListRow
        active={isPlaybackLoopActive}
        disabled={playbackAction.disabled}
        leadingIcon={
          <MaterialCommunityIcons
            color={
              isPlaybackLoopActive
                ? '#173229'
                : appTheme.colors.secondaryText
            }
            name="repeat"
            size={22}
          />
        }
        message={
          loopMessage ? (
            <Text numberOfLines={2} style={styles.rowMessage}>
              {loopMessage}
            </Text>
          ) : null
        }
        metadata={
          <SearchHighlightedText
            numberOfLines={1}
            query={highlightQuery}
            style={styles.rowSupportingLabel}
            text={loopCard.metadataLabel}
          />
        }
        onPress={handleTogglePlayback}
        overflowTrigger={
          menuActions.length > 0 ? (
            <OverflowMenuTrigger
              accessibilityLabel={`${loopCard.loop.name} options`}
              iconColor={appTheme.colors.secondaryText}
              onPress={onOpenOptions}
              style={styles.rowOverflowTrigger}
            />
          ) : null
        }
        title={
          <SearchHighlightedText
            numberOfLines={1}
            query={highlightQuery}
            style={styles.rowTitle}
            text={loopCard.loop.name}
          />
        }
      />
      <OptionsMenuSheet
        actions={sheetActions.map((action) => {
          return {
            ...action,
            onPress: () => {
              onCloseOptions();
              action.onPress();
            },
          };
        })}
        isVisible={isOptionsVisible}
        onClose={onCloseOptions}
        title={loopCard.loop.name}
      />
    </>
  );
};

const styles = StyleSheet.create({
  rowMessage: {
    color: '#9a4d2d',
    fontSize: 12,
    lineHeight: 17,
  },
  rowOverflowTrigger: {
    position: 'relative',
    right: 0,
    top: 0,
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
});
