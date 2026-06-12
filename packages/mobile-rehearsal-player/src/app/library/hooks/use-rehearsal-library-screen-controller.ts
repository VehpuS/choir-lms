import type { DriveAuthorizationState } from '@org/google-drive';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useDriveLibrary } from '../drive/hooks/use-drive-library';
import {
  getDriveLibraryStatusCopy,
  getDriveSearchContextCopy,
} from '../drive/utils/drive-library-view-model';
import { resolveDriveSourceActions } from '../drive/utils/drive-search-preview-actions';
import { useSavedPlaylists } from '../playlists/hooks/use-saved-playlists';
import { getSavedLoopRemovalCopy } from '../utils/saved-loop-view-model';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibraryRemovalCopy,
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from '../utils/saved-rehearsal-library-view-model';
import { getSavedTrackPlaybackStatusCopy } from '../utils/saved-track-playback-view-model';
import { usePreparedLoopBuilderTrack } from './use-prepared-loop-builder-track';
import { useSavedLoops } from './use-saved-loops';
import { useSavedRehearsalLibrary } from './use-saved-rehearsal-library';
import type { useSavedTrackPlayback } from './use-saved-track-playback';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'resolveTrackDuration'
  | 'toggleSourcePlayback'
>;

type RehearsalLibraryScreenControllerOptions = {
  authState: DriveAuthorizationState;
  googleAuthConfigured: boolean;
  playback: SavedTrackPlaybackController;
};

export const useRehearsalLibraryScreenController = ({
  authState,
  googleAuthConfigured,
  playback,
}: RehearsalLibraryScreenControllerOptions) => {
  const [selectedLoopSourceId, setSelectedLoopSourceId] = useState<
    string | null
  >(null);
  const driveLibrary = useDriveLibrary(authState);
  const savedLibrary = useSavedRehearsalLibrary();
  const savedLoops = useSavedLoops();
  const playlists = useSavedPlaylists();
  const canRefresh = authState.status === 'authorized';
  const isSearchMode = driveLibrary.activeSearchQuery !== null;
  const discoveryStatusCopy = getDriveLibraryStatusCopy({
    authState,
    activeSearchQuery: null,
    browseSnapshot: driveLibrary.browseSnapshot,
    googleAuthConfigured,
    isLoading: !isSearchMode && driveLibrary.isLoading,
    issue: isSearchMode ? null : driveLibrary.issue,
    searchSnapshot: driveLibrary.searchSnapshot,
  });
  const searchStatusCopy = getDriveLibraryStatusCopy({
    authState,
    activeSearchQuery: driveLibrary.activeSearchQuery,
    browseSnapshot: driveLibrary.browseSnapshot,
    currentSearchLocation: driveLibrary.currentLocation,
    googleAuthConfigured,
    isLoading: isSearchMode && driveLibrary.isLoading,
    issue: isSearchMode ? driveLibrary.issue : null,
    searchSnapshot: driveLibrary.searchSnapshot,
  });
  const savedLibrarySources = resolveSavedRehearsalLibrarySources({
    authState,
    savedSources: savedLibrary.savedSources,
    visibleSources: [
      ...driveLibrary.browseSnapshot.playableSources,
      ...driveLibrary.browseSnapshot.unavailableSources,
      ...driveLibrary.searchSnapshot.playableSources,
      ...driveLibrary.searchSnapshot.unavailableSources,
    ],
  });
  const savedSourceIds = new Set(
    savedLibrary.savedSources.map((source) => source.id),
  );
  const savedLibraryStatusCopy = getSavedRehearsalLibraryStatusCopy({
    authState,
    isLoading: savedLibrary.isLoading,
    issue: savedLibrary.issue,
    savedSources: savedLibrarySources,
  });
  const savedTrackPlaybackStatusCopy = getSavedTrackPlaybackStatusCopy({
    activePlayableItem: playback.activePlayableItem,
    durationSeconds: playback.progress.duration,
    isPreparing: playback.isPreparing,
    issue: playback.issue,
    playbackState: playback.playbackState,
    positionSeconds: playback.progress.position,
  });
  const {
    pendingSourceId: pendingLoopBuilderSourceId,
    prepareLoopBuilderTrack,
    selectedTrack: selectedLoopTrack,
  } = usePreparedLoopBuilderTrack({
    activePlayableItem: playback.activePlayableItem,
    authState,
    playbackDurationSeconds: playback.progress.duration,
    persistResolvedSourceDuration: savedLibrary.saveResolvedSourceDuration,
    resolveTrackDuration: playback.resolveTrackDuration,
    savedSources: savedLibrarySources,
    selectedSourceId: selectedLoopSourceId,
  });
  const isSavedLibraryMutating = savedLibrary.pendingSourceId !== null;

  const openLoopBuilderForSource = (
    source: (typeof savedLibrarySources)[number],
  ) => {
    void (async () => {
      await prepareLoopBuilderTrack(source);
      setSelectedLoopSourceId(source.id);
    })();
  };

  const confirmRemoveSource = (
    source: (typeof savedLibrarySources)[number],
  ) => {
    const removalCopy = getSavedRehearsalLibraryRemovalCopy({
      dependentLoops: getSavedRehearsalLibraryDependentLoops(
        savedLoops.savedLoops,
        source.id,
      ),
      source,
    });

    Alert.alert(removalCopy.title, removalCopy.message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: removalCopy.confirmLabel,
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const didRemove = await savedLibrary.removeSource(source);

            if (!didRemove) {
              return;
            }

            if (selectedLoopSourceId === source.id) {
              setSelectedLoopSourceId(null);
            }

            await savedLoops.refreshLoops();
          })();
        },
      },
    ]);
  };

  const confirmRemoveLoop = (loop: (typeof savedLoops.savedLoops)[number]) => {
    const removalCopy = getSavedLoopRemovalCopy(loop);

    Alert.alert(removalCopy.title, removalCopy.message, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: removalCopy.confirmLabel,
        style: 'destructive',
        onPress: () => {
          void savedLoops.deleteLoop(loop);
        },
      },
    ]);
  };

  const getDriveSourceActions = (
    source: (typeof driveLibrary.browseSnapshot.playableSources)[number],
  ) => {
    const isSaved = savedSourceIds.has(source.id);
    const isPending = savedLibrary.pendingSourceId === source.id;

    return resolveDriveSourceActions({
      activePlayableItem: playback.activePlayableItem,
      canMutateLibrary: savedLibrary.canMutateLibrary,
      isLibraryLoading: savedLibrary.isLoading,
      isLibraryMutating: isSavedLibraryMutating,
      isPreparingPlayback: playback.isPreparing,
      isSaved,
      isSavePending: isPending,
      onPreviewPlayback: () => {
        void playback.toggleSourcePlayback(source);
      },
      onRemoveSource: () => {
        confirmRemoveSource(source);
      },
      onSaveSource: () => {
        void savedLibrary.saveSource(source);
      },
      playbackState: playback.playbackState,
      source,
    });
  };

  return {
    discovery: {
      browseSnapshot: driveLibrary.browseSnapshot,
      canRefresh,
      currentLocation: driveLibrary.currentLocation,
      folderTitle:
        driveLibrary.currentLocation.rootKind === 'shared' &&
        driveLibrary.currentLocation.kind === 'root'
          ? `Shared folders (${driveLibrary.browseSnapshot.folders.length})`
          : `Folders (${driveLibrary.browseSnapshot.folders.length})`,
      goToLocation: driveLibrary.goToLocation,
      isLoading: !isSearchMode && driveLibrary.isLoading,
      navigationStack: driveLibrary.navigationStack,
      openFolder: driveLibrary.openFolder,
      playableSourceTitle: `Audio in ${driveLibrary.currentLocation.name} (${driveLibrary.browseSnapshot.playableSources.length})`,
      playableSources: driveLibrary.browseSnapshot.playableSources,
      refresh: driveLibrary.refresh,
      selectRoot: driveLibrary.selectRoot,
      statusCopy: discoveryStatusCopy,
      unavailableSourceTitle: `Unavailable or unsupported in ${driveLibrary.currentLocation.name} (${driveLibrary.browseSnapshot.unavailableSources.length})`,
      unavailableSources: driveLibrary.browseSnapshot.unavailableSources,
    },
    getDriveSourceActions,
    getSourceMessage(
      source: (typeof driveLibrary.browseSnapshot.playableSources)[number],
    ) {
      return getSavedRehearsalLibrarySourceIssue(
        savedLibrary.issue,
        source,
        'save',
      );
    },
    savedLibrary: {
      canMutateLibrary: savedLibrary.canMutateLibrary,
      canMutateLoops: savedLoops.canMutateLoops,
      isLoading: savedLibrary.isLoading,
      isSavedLoopsLoading: savedLoops.isLoading,
      pendingLoopId: savedLoops.pendingLoopId,
      pendingSourceId: savedLibrary.pendingSourceId,
      removeLoop: confirmRemoveLoop,
      removeSource: confirmRemoveSource,
      savedLibraryIssue: savedLibrary.issue,
      savedLibrarySources,
      savedLoopIssue: savedLoops.issue,
      savedLoops: savedLoops.savedLoops,
      savedLibraryStatusCopy,
      saveLoop: savedLoops.saveLoop,
      saveSource: savedLibrary.saveSource,
      savedSourceIds,
      savedTrackPlaybackStatusCopy,
      openLoopBuilderForSource,
      pendingLoopBuilderSourceId,
      selectedLoopSourceId,
      selectedLoopTrack,
      setSelectedLoopSourceId,
      trackCount: savedLibrarySources.length,
    },
    playlists,
    search: {
      activeSearchQuery: driveLibrary.activeSearchQuery,
      canSearch: canRefresh,
      clearSearch: driveLibrary.clearSearch,
      isLoading: isSearchMode && driveLibrary.isLoading,
      isSearchMode,
      playableSourceTitle: `Matching audio (${driveLibrary.searchSnapshot.playableSources.length})`,
      playableSources: driveLibrary.searchSnapshot.playableSources,
      recentSearchTerms: driveLibrary.recentSearchTerms,
      searchContextCopy: getDriveSearchContextCopy(
        driveLibrary.currentLocation,
      ),
      searchQuery: driveLibrary.searchQuery,
      setSearchQuery: driveLibrary.setSearchQuery,
      statusCopy: searchStatusCopy,
      submitSearch: driveLibrary.submitSearch,
      submitSearchQuery: driveLibrary.submitSearchQuery,
      totalResultCount:
        driveLibrary.searchSnapshot.playableSources.length +
        driveLibrary.searchSnapshot.unavailableSources.length,
      unavailableSourceTitle: `Unavailable or unsupported results (${driveLibrary.searchSnapshot.unavailableSources.length})`,
      unavailableSources: driveLibrary.searchSnapshot.unavailableSources,
    },
  };
};
