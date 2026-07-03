import { type PlayableItem } from '@org/audio-library-models';
import { useState } from 'react';
import { Text, View } from 'react-native';

import {
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../../playback/utils/saved-track-playback-view-model';
import type {
  SavedLoopCard,
  SavedLoopIssue,
} from '../../utils/saved-loop-view-model';
import { savedLoopListStyles as styles } from '../saved-loop-list-styles';
import { SavedLoopListRow } from './saved-loop-list-row';

type SavedLoopListProps = {
  activePlayableItem: PlayableItem | null;
  canMutateLoops: boolean;
  canMutatePlaylists: boolean;
  canQueueAsNext: boolean;
  editingLoopId: string | null;
  highlightQuery: string | null;
  isPlaybackPreparing: boolean;
  isPlaylistMutating: boolean;
  loopCards: SavedLoopCard[];
  loopIssue: SavedLoopIssue | null;
  onEditLoop: (loop: SavedLoopCard['loop']) => void;
  onEditLoopTags: (loop: SavedLoopCard['loop']) => void;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  onPlayLoopSeries?: (loopId: string) => void;
  onToggleCurrentPlayback?: () => void;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  queuePlayableItemUpNext: (playableItem: PlayableItem) => void;
  removeLoop: (loop: SavedLoopCard['loop']) => void;
  title?: string;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
};

export const SavedLoopList = ({
  activePlayableItem,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  editingLoopId,
  highlightQuery,
  isPlaybackPreparing,
  isPlaylistMutating,
  loopCards,
  loopIssue,
  onEditLoop,
  onEditLoopTags,
  onOpenLoopPlaylistSelector,
  onPlayLoopSeries,
  onToggleCurrentPlayback,
  pendingLoopId,
  playbackIssue,
  playbackState,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeLoop,
  title,
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
        {title ?? `Saved loops (${loopCards.length})`}
      </Text>

      {loopCards.map((loopCard) => {
        return (
          <SavedLoopListRow
            activePlayableItem={activePlayableItem}
            canMutateLoops={canMutateLoops}
            canMutatePlaylists={canMutatePlaylists}
            canQueueAsNext={canQueueAsNext}
            editingLoopId={editingLoopId}
            highlightQuery={highlightQuery}
            isOptionsVisible={activeOptionsLoopId === loopCard.loop.id}
            isPlaybackPreparing={isPlaybackPreparing}
            isPlaylistMutating={isPlaylistMutating}
            key={loopCard.loop.id}
            loopCard={loopCard}
            loopIssue={loopIssue}
            onCloseOptions={() => {
              setActiveOptionsLoopId(null);
            }}
            onEditLoop={onEditLoop}
            onEditLoopTags={onEditLoopTags}
            onOpenLoopPlaylistSelector={onOpenLoopPlaylistSelector}
            onOpenOptions={() => {
              setActiveOptionsLoopId(loopCard.loop.id);
            }}
            onPlayLoopSeries={onPlayLoopSeries}
            onToggleCurrentPlayback={onToggleCurrentPlayback}
            pendingLoopId={pendingLoopId}
            playbackIssue={playbackIssue}
            playbackState={playbackState}
            queuePlayableItemNext={queuePlayableItemNext}
            queuePlayableItemUpNext={queuePlayableItemUpNext}
            removeLoop={removeLoop}
            togglePlayableItemPlayback={togglePlayableItemPlayback}
          />
        );
      })}
    </View>
  );
};