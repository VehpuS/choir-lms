import { type NamedLoop, type PlayableItem } from '@org/audio-library-models';
import { StyleSheet, Text, View } from 'react-native';

import { DriveLibraryStatusCard } from '../../drive/components/drive-library-status-card';
import type { DriveLibrarySource } from '../../drive/utils/drive-library-view-model';
import { SectionHeading } from '../../components/section-heading';
import { useSavedLoopSectionState } from '../hooks/use-saved-loop-section-state';
import {
  type SavedTrackPlaybackIssue,
  type SavedTrackPlaybackState,
} from '../../playback/utils/saved-track-playback-view-model';
import type { PlaylistPlaybackActionCopy } from '../../playlists/utils/saved-playlist-playback-view-model';
import type { SavedLoopIssue } from '../utils/saved-loop-view-model';
import {
  getSavedLoopsStatusCopy,
  resolveSavedLoopCards,
  SAVED_LOOP_SECTION_BODY_COPY,
} from '../utils/saved-loop-view-model';
import type { TrackScopedLoopDetailCopy } from '../utils/track-scoped-loop-view-model';
import { useLoopPreviewPlaybackContext } from './loop-preview-playback-context';
import { LoopRangeSelectorSurface } from './loop-range-selector-surface';
import { SavedLoopList } from './saved-loop-list';
import { TrackScopedLoopDetailCard } from './track-scoped-loop-detail-card';

type SavedLoopSectionProps = {
  activePlayableItem: PlayableItem | null;
  editingLoop: NamedLoop | null;
  isPlaybackPreparing: boolean;
  isTrackLoopDetailVisible: boolean;
  canMutateLoops: boolean;
  canQueueAsNext: boolean;
  highlightQuery: string | null;
  isSavedLoopsLoading: boolean;
  pendingLoopId: string | null;
  playbackIssue: SavedTrackPlaybackIssue | null;
  playbackState: SavedTrackPlaybackState | undefined;
  canMutatePlaylists: boolean;
  isPlaylistMutating: boolean;
  onCloseLoopBuilder: () => void;
  onEditLoop: (loop: NamedLoop) => void;
  toggleActivePlayback: () => Promise<void>;
  removeLoop: (loop: NamedLoop) => void;
  savedSources: DriveLibrarySource[];
  savedLoopIssue: SavedLoopIssue | null;
  savedLoops: NamedLoop[];
  saveLoop: (loop: NamedLoop) => Promise<boolean>;
  selectedTrack: PlayableItem | null;
  trackLoopView: {
    detailCopy: TrackScopedLoopDetailCopy;
    isMakeNewLoopDisabled: boolean;
    loops: NamedLoop[];
    makeNewLoopLabel: string;
    onClose: () => void;
    onMakeNewLoop: () => void;
    onPlayLoopSeries: (loopId?: string) => void;
    orderedPlaybackAction: PlaylistPlaybackActionCopy;
  } | null;
  onOpenLoopPlaylistSelector: (loopId: string) => void;
  togglePlayableItemPlayback: (playableItem: PlayableItem) => Promise<void>;
  queuePlayableItemNext: (playableItem: PlayableItem) => void;
  queuePlayableItemUpNext: (playableItem: PlayableItem) => void;
};

const SECONDARY_TEXT = '#5f5647';

export const SavedLoopSection = ({
  activePlayableItem,
  editingLoop,
  isPlaybackPreparing,
  isTrackLoopDetailVisible,
  canMutateLoops,
  canQueueAsNext,
  highlightQuery,
  isSavedLoopsLoading,
  pendingLoopId,
  playbackIssue,
  playbackState,
  canMutatePlaylists,
  isPlaylistMutating,
  onCloseLoopBuilder,
  onEditLoop,
  toggleActivePlayback,
  removeLoop,
  savedSources,
  savedLoopIssue,
  savedLoops,
  saveLoop,
  selectedTrack,
  trackLoopView,
  onOpenLoopPlaylistSelector,
  togglePlayableItemPlayback,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
}: SavedLoopSectionProps) => {
  const { playbackPositionSeconds, seekActivePlaybackToPosition } =
    useLoopPreviewPlaybackContext();
  const {
    activeEditingLoopId,
    builderIssue,
    canSaveLoop,
    handleLoopNameChange,
    handleRangeChange,
    handleSaveLoop,
    handleTogglePreview,
    isEditingLoop,
    loopDraft,
    previewActionLabel,
    previewDisabled,
    previewPlayableItem,
    previewTimeline,
    selectedTrackDurationMs,
  } = useSavedLoopSectionState({
    activePlayableItem,
    canMutateLoops,
    editingLoop,
    isPlaybackPreparing,
    onCloseLoopBuilder,
    pendingLoopId,
    playbackPositionSeconds,
    playbackState,
    saveLoop,
    savedLoopIssue,
    selectedTrack,
    togglePlayableItemPlayback,
  });

  const savedLoopCards = resolveSavedLoopCards(savedLoops, savedSources);
  const trackLoopViewCards = trackLoopView
    ? resolveSavedLoopCards(trackLoopView.loops, savedSources)
    : [];
  const unresolvedLoopCount = savedLoopCards.filter((loopCard) => {
    return loopCard.message !== undefined || loopCard.playableItem === null;
  }).length;
  const statusCopy = getSavedLoopsStatusCopy({
    isLoading: isSavedLoopsLoading,
    issue: savedLoopIssue,
    savedLoopCount: savedLoopCards.length,
    unresolvedLoopCount,
  });
  const isLoopMutating = pendingLoopId !== null;
  const shouldShowStatusCard =
    isSavedLoopsLoading || statusCopy.tone !== 'ready';

  return (
    <View style={styles.section}>
      {!isTrackLoopDetailVisible ? (
        <SectionHeading
          body={SAVED_LOOP_SECTION_BODY_COPY}
          eyebrow="Saved loops"
          style={styles.sectionCopy}
          title="Saved loops"
        />
      ) : null}

      {!isTrackLoopDetailVisible && shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={isSavedLoopsLoading}
          loadingLabel="Refreshing saved loops…"
          statusCopy={statusCopy}
        />
      ) : null}

      {isTrackLoopDetailVisible && trackLoopView ? (
        <TrackScopedLoopDetailCard
          detailCopy={trackLoopView.detailCopy}
          isMakeNewLoopDisabled={trackLoopView.isMakeNewLoopDisabled}
          makeNewLoopLabel={trackLoopView.makeNewLoopLabel}
          onClose={trackLoopView.onClose}
          onMakeNewLoop={trackLoopView.onMakeNewLoop}
          onPlayOrderedTrackLoops={() => {
            trackLoopView.onPlayLoopSeries();
          }}
          orderedPlaybackAction={trackLoopView.orderedPlaybackAction}
        >
          {trackLoopViewCards.length > 0 ? (
            <SavedLoopList
              activePlayableItem={activePlayableItem}
              canMutateLoops={canMutateLoops}
              canMutatePlaylists={canMutatePlaylists}
              canQueueAsNext={canQueueAsNext}
              editingLoopId={activeEditingLoopId}
              highlightQuery={null}
              isPlaybackPreparing={isPlaybackPreparing}
              isPlaylistMutating={isPlaylistMutating}
              loopCards={trackLoopViewCards}
              loopIssue={savedLoopIssue}
              onEditLoop={onEditLoop}
              onOpenLoopPlaylistSelector={onOpenLoopPlaylistSelector}
              onPlayLoopSeries={(loopId) => {
                trackLoopView.onPlayLoopSeries(loopId);
              }}
              onToggleCurrentPlayback={() => {
                void toggleActivePlayback();
              }}
              pendingLoopId={pendingLoopId}
              playbackIssue={playbackIssue}
              playbackState={playbackState}
              queuePlayableItemNext={queuePlayableItemNext}
              queuePlayableItemUpNext={queuePlayableItemUpNext}
              removeLoop={removeLoop}
              title={`Track loops (${trackLoopViewCards.length})`}
              togglePlayableItemPlayback={togglePlayableItemPlayback}
            />
          ) : (
            <Text style={styles.sectionBody}>
              {trackLoopView.detailCopy.emptyMessage}
            </Text>
          )}
        </TrackScopedLoopDetailCard>
      ) : null}

      <LoopRangeSelectorSurface
        builderIssue={builderIssue}
        canSaveLoop={canSaveLoop}
        endMs={loopDraft.endMs}
        eyebrowLabel={isEditingLoop ? 'Edit loop' : 'New loop'}
        isSavingLoop={isLoopMutating}
        isVisible={selectedTrack !== null}
        loopName={loopDraft.loopName}
        onClose={onCloseLoopBuilder}
        onLoopNameChange={handleLoopNameChange}
        onRangeChange={handleRangeChange}
        onSaveLoop={() => {
          void handleSaveLoop();
        }}
        onScrubPreview={(positionSeconds) => {
          void seekActivePlaybackToPosition(positionSeconds);
        }}
        onTogglePreview={handleTogglePreview}
        previewActionLabel={previewActionLabel}
        previewDisabled={previewDisabled}
        previewPlayableItem={previewPlayableItem}
        previewTimeline={previewTimeline}
        rangeMaximumMs={selectedTrackDurationMs}
        saveActionLabel={isEditingLoop ? 'Save changes' : 'Save loop'}
        selectedTrack={selectedTrack}
        savingActionLabel={isEditingLoop ? 'Saving changes…' : 'Saving loop…'}
        startMs={loopDraft.startMs}
      />

      {!isTrackLoopDetailVisible ? (
        <SavedLoopList
          activePlayableItem={activePlayableItem}
          canMutateLoops={canMutateLoops}
          canMutatePlaylists={canMutatePlaylists}
          editingLoopId={activeEditingLoopId}
          highlightQuery={highlightQuery}
          isPlaylistMutating={isPlaylistMutating}
          isPlaybackPreparing={isPlaybackPreparing}
          loopCards={savedLoopCards}
          loopIssue={savedLoopIssue}
          pendingLoopId={pendingLoopId}
          playbackIssue={playbackIssue}
          playbackState={playbackState}
          canQueueAsNext={canQueueAsNext}
          onEditLoop={onEditLoop}
          onOpenLoopPlaylistSelector={onOpenLoopPlaylistSelector}
          queuePlayableItemNext={queuePlayableItemNext}
          queuePlayableItemUpNext={queuePlayableItemUpNext}
          removeLoop={removeLoop}
          title={`Saved loops (${savedLoopCards.length})`}
          togglePlayableItemPlayback={togglePlayableItemPlayback}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  sectionCopy: {
    gap: 8,
  },
  sectionBody: {
    color: SECONDARY_TEXT,
    fontSize: 14,
    lineHeight: 20,
  },
});
