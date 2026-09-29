import { type PlayableItem } from '@org/audio-library-models';
import { StyleSheet } from 'react-native';

import { OverflowMenuTrigger } from '../../../../components/overflow-menu-trigger';
import { OptionsMenuSheet } from '../../../components/options-menu-sheet';
import { resolveSavedLoopMenu } from '../../../components/saved-item-menu/saved-item-menus';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../../playback/utils/saved-track-playback-view-model';
import {
  getSavedLoopItemIssue,
  type SavedLoopCard,
  type SavedLoopIssue,
} from '../../utils/saved-loop-view-model';
import { SavedLoopListCard } from './saved-loop-list-card';
import { resolveSavedLoopCardPresentation } from './saved-loop-list-card-model';

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
  // The same loop menu as Files, with no view actions (task 2.12).
  const sheetActions = resolveSavedLoopMenu(
    {
      canEditLoop: playableItem !== null,
      canMutateLoops,
      canMutatePlaylists,
      canQueueAsNext,
      hasPlayableItem: playableItem !== null,
      isEditingLoop: editingLoopId === loopCard.loop.id,
      isLoopMutating: pendingLoopId !== null,
      isPendingRemoval: pendingLoopId === loopCard.loop.id,
      isPlaylistMutating,
      loopName: loopCard.loop.name,
      onAddToPlaylist: () => {
        onOpenLoopPlaylistSelector(loopCard.loop.id);
      },
      onAddToQueue: () => {
        if (playableItem) {
          queuePlayableItemUpNext(playableItem);
        }
      },
      onEditLoop: () => {
        onEditLoop(loopCard.loop);
      },
      onEditTags: () => {
        onEditLoopTags(loopCard.loop);
      },
      onPlayNext: () => {
        if (playableItem) {
          queuePlayableItemNext(playableItem);
        }
      },
      onRemoveFromLibrary: () => {
        removeLoop(loopCard.loop);
      },
    },
    { idPrefix: `loop:${loopCard.loop.id}` },
  );
  const loopMessage =
    getSavedLoopItemIssue(loopIssue, loopCard.loop.id) ??
    loopCard.message ??
    (playableItem
      ? getSavedTrackPlaybackItemIssue(playbackIssue, playableItem)
      : undefined);

  return (
    <>
      <SavedLoopListCard
        disabled={playableItem === null}
        highlightQuery={highlightQuery}
        message={loopMessage}
        onTogglePlayback={handleTogglePlayback}
        overflowTrigger={
          sheetActions.length > 0 ? (
            <OverflowMenuTrigger
              accessibilityLabel={`${loopCard.loop.name} options`}
              onPress={onOpenOptions}
              style={styles.rowOverflowTrigger}
            />
          ) : null
        }
        parentTrackName={loopCard.parentTrack.name}
        playableItem={playableItem}
        presentation={resolveSavedLoopCardPresentation({
          isActive: isPlaybackLoopActive,
          loop: loopCard.loop,
          playbackActionLabel: playbackAction.label,
        })}
        ringDisabled={playbackAction.disabled}
        title={loopCard.loop.name}
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
  rowOverflowTrigger: {
    position: 'relative',
    right: 0,
    top: 0,
  },
});
