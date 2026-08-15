import { createTrackPlayableItem } from '@org/audio-library-models';

import { DriveLibrarySourceGroup } from '../../drive/components/drive-library-source-group';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  isSavedTrackPlaybackActive,
} from '../../playback/utils/saved-track-playback-view-model';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibrarySourceIssue,
} from '../../saved-rehearsal-library/view-model';
import {
  TRACK_ACTION_ORDER,
  sortActionsByLabelOrder,
} from './files-row-actions-contract';
import type { SavedRehearsalLibrarySectionProps } from './types';

type BrowseSourceGroupProps = Pick<
  SavedRehearsalLibrarySectionProps,
  | 'activePlayableItem'
  | 'canMutateLibrary'
  | 'canMutateLoops'
  | 'canMutatePlaylists'
  | 'isPlaybackPreparing'
  | 'playbackIssue'
  | 'playbackState'
  | 'queuePlayableItemNext'
  | 'queuePlayableItemUpNext'
  | 'removeSource'
  | 'savedLibraryIssue'
  | 'savedLoops'
  | 'toggleSourcePlayback'
> & {
  canQueueAsNext: boolean;
  isLoopMutating: boolean;
  isPlaylistMutating: boolean;
  isSavedLibraryMutating: boolean;
  onOpenLoopBuilderForSource: SavedRehearsalLibrarySectionProps['openLoopBuilderForSource'];
  onOpenSourceTagEditor: (
    source: SavedRehearsalLibrarySectionProps['savedLibrarySources'][number],
  ) => void;
  openTrackLoopView: (sourceId: string) => void;
  openSourcePlaylistSelector: (sourceId: string) => void;
  pendingLoopBuilderSourceId: string | null;
  pendingSourceId: string | null;
  savedSourceTitle: string;
  searchQuery: string | null;
  sources: SavedRehearsalLibrarySectionProps['savedLibrarySources'];
};

export const BrowseSourceGroup = ({
  activePlayableItem,
  canMutateLibrary,
  canMutateLoops,
  canMutatePlaylists,
  canQueueAsNext,
  isLoopMutating,
  isPlaybackPreparing,
  isPlaylistMutating,
  isSavedLibraryMutating,
  onOpenLoopBuilderForSource,
  onOpenSourceTagEditor,
  openSourcePlaylistSelector,
  openTrackLoopView,
  pendingLoopBuilderSourceId,
  pendingSourceId,
  playbackIssue,
  playbackState,
  queuePlayableItemNext,
  queuePlayableItemUpNext,
  removeSource,
  savedLibraryIssue,
  savedLoops,
  savedSourceTitle,
  searchQuery,
  sources,
  toggleSourcePlayback,
}: BrowseSourceGroupProps) => {
  return (
    <DriveLibrarySourceGroup
      getActions={(source) => {
        const isPending = pendingSourceId === source.id;
        const trackPlayableItem = createTrackPlayableItem(source);
        const playbackAction = getSavedTrackPlaybackActionCopy({
          activePlayableItem,
          isPreparing: isPlaybackPreparing,
          playableItem: trackPlayableItem,
          playbackState,
        });
        const isPlaybackSourceActive = isSavedTrackPlaybackActive(
          activePlayableItem,
          trackPlayableItem,
        );

        return sortActionsByLabelOrder(
          resolveSavedTrackRowActions({
            canMutateLibrary,
            canMutateLoops,
            canMutatePlaylists,
            canQueueAsNext,
            hasAvailableSource: source.availability.status === 'available',
            hasSavedLoops:
              getSavedRehearsalLibraryDependentLoops(savedLoops, source.id)
                .length > 0,
            isLoopBuilderPreparing: pendingLoopBuilderSourceId !== null,
            isLoopMutating,
            isPendingLoopSource: pendingLoopBuilderSourceId === source.id,
            isPendingRemoval: isPending,
            isPlaybackSourceActive,
            isPlaylistMutating,
            isSavedLibraryMutating,
            onOpenLoopBuilder: () => {
              onOpenLoopBuilderForSource(source);
            },
            onOpenPlaylistSelector: () => {
              openSourcePlaylistSelector(source.id);
            },
            onOpenTagEditor: () => {
              onOpenSourceTagEditor(source);
            },
            onQueueNext: () => {
              queuePlayableItemNext(trackPlayableItem);
            },
            onQueueUpNext: () => {
              queuePlayableItemUpNext(trackPlayableItem);
            },
            onRemove: () => {
              removeSource(source);
            },
            onTogglePlayback: () => {
              void toggleSourcePlayback(source);
            },
            onViewTrackLoops: () => {
              openTrackLoopView(source.id);
            },
            playbackAction,
            sourceName: source.name,
          }),
          TRACK_ACTION_ORDER,
        );
      }}
      getMessage={(source) => {
        return (
          getSavedRehearsalLibrarySourceIssue(
            savedLibraryIssue,
            source,
            'remove',
          ) ??
          getSavedTrackPlaybackItemIssue(
            playbackIssue,
            createTrackPlayableItem(source),
          )
        );
      }}
      highlightQuery={searchQuery}
      isSourcePreparingLoop={(source) => {
        return pendingLoopBuilderSourceId === source.id;
      }}
      sources={sources}
      title={savedSourceTitle}
    />
  );
};
