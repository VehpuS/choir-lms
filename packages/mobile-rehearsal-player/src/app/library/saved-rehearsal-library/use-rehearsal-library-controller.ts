import type { DriveAuthorizationState } from '@org/google-drive';
import { useMemo } from 'react';

import { useDriveLibrary } from '../drive/hooks/use-drive-library';
import {
  getDriveLibraryStatusCopy,
  getDriveSearchContextCopy,
} from '../drive/utils/drive-library-view-model';
import { resolveDriveSourceActions } from '../drive/utils/drive-search-preview-actions';
import { usePreparedLoopBuilderTrack } from '../loops/hooks/use-prepared-loop-builder-track';
import { useSavedLoops } from '../loops/hooks/use-saved-loops';
import type { useSavedTrackPlayback } from '../playback/hooks/use-saved-track-playback';
import { getSavedTrackPlaybackStatusCopy } from '../playback/utils/saved-track-playback-view-model';
import { useSavedPlaylists } from '../playlists/hooks/use-saved-playlists';
import { useLibraryFiles } from './use-library-files';
import { useSavedRehearsalLibrary } from './use-saved-rehearsal-library';
import { useSavedRehearsalLibraryRemovalActions } from './use-saved-rehearsal-library-removal-actions';
import {
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from './view-model';

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
  onAuthorizationExpired?: () => void;
  onAuthorizationRequired?: () => Promise<void> | void;
  playback: SavedTrackPlaybackController;
};

export const useRehearsalLibraryController = ({
  authState,
  googleAuthConfigured,
  onAuthorizationExpired,
  onAuthorizationRequired,
  playback,
}: RehearsalLibraryScreenControllerOptions) => {
  const driveLibrary = useDriveLibrary(
    authState,
    onAuthorizationExpired,
    onAuthorizationRequired,
  );
  const savedLibrary = useSavedRehearsalLibrary();
  const savedLoops = useSavedLoops();
  const playlists = useSavedPlaylists();
  const savedLibraryRemovalActions = useSavedRehearsalLibraryRemovalActions({
    deleteLoop: savedLoops.deleteLoop,
    refreshLoops: savedLoops.refreshLoops,
    refreshPlaylists: playlists.refreshPlaylists,
    removeSource: savedLibrary.removeSource,
    savedLoops: savedLoops.savedLoops,
  });
  const canRefresh =
    authState.status === 'authorized' || authState.status === 'expired';
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
  const visibleSources = useMemo(() => {
    return [
      ...driveLibrary.browseSnapshot.playableSources,
      ...driveLibrary.browseSnapshot.unavailableSources,
      ...driveLibrary.searchSnapshot.playableSources,
      ...driveLibrary.searchSnapshot.unavailableSources,
    ];
  }, [
    driveLibrary.browseSnapshot.playableSources,
    driveLibrary.browseSnapshot.unavailableSources,
    driveLibrary.searchSnapshot.playableSources,
    driveLibrary.searchSnapshot.unavailableSources,
  ]);
  const savedLibrarySources = useMemo(() => {
    return resolveSavedRehearsalLibrarySources({
      authState,
      savedSources: savedLibrary.savedSources,
      visibleSources,
    });
  }, [authState, savedLibrary.savedSources, visibleSources]);
  const savedSourceIds = new Set(
    savedLibrary.savedSources.map((source) => source.id),
  );
  const savedLibraryStatusCopy = getSavedRehearsalLibraryStatusCopy({
    authState,
    isLoading: savedLibrary.isLoading,
    issue: savedLibrary.issue,
    savedSources: savedLibrarySources,
  });
  const libraryFiles = useLibraryFiles({
    refreshSavedLoops: savedLoops.refreshLoops,
    refreshSavedPlaylists: playlists.refreshPlaylists,
    refreshSavedSources: savedLibrary.refreshSources,
    savedLoops: savedLoops.savedLoops,
    savedPlaylists: playlists.savedPlaylists,
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
    selectedSourceId: savedLibraryRemovalActions.selectedLoopSourceId,
  });
  const isSavedLibraryMutating = savedLibrary.pendingSourceId !== null;

  const openLoopBuilderForSource = (
    source: (typeof savedLibrarySources)[number],
  ) => {
    void (async () => {
      await prepareLoopBuilderTrack(source);
      savedLibraryRemovalActions.setSelectedLoopSourceId(source.id);
    })();
  };

  const getDriveSourceActions = (
    source: (typeof driveLibrary.browseSnapshot.playableSources)[number],
  ) => {
    const isSaved = savedSourceIds.has(source.id);
    const isPending = savedLibrary.pendingSourceId === source.id;

    const saveDiscoveredSource = async () => {
      const didSave = await savedLibrary.saveSource(source);

      if (!didSave) {
        return false;
      }

      const pendingFolderId = libraryFiles.consumePendingDriveImportFolderId();
      const rootFolderId = libraryFiles.rootFolderId;

      if (!pendingFolderId) {
        return true;
      }

      if (!rootFolderId || pendingFolderId === rootFolderId) {
        return true;
      }

      return libraryFiles.linkEntityToFolder({
        entityId: source.id,
        entityKind: 'track',
        parentFolderId: pendingFolderId,
      });
    };

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
        savedLibraryRemovalActions.confirmRemoveSource(source);
      },
      onSaveSource: () => {
        void saveDiscoveredSource();
      },
      playbackState: playback.playbackState,
      source,
    });
  };

  return {
    confirmationDialog: savedLibraryRemovalActions.confirmationDialog,
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
      removeLoop: savedLibraryRemovalActions.confirmRemoveLoop,
      removeSource: savedLibraryRemovalActions.confirmRemoveSource,
      files: libraryFiles,
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
      selectedLoopSourceId: savedLibraryRemovalActions.selectedLoopSourceId,
      selectedLoopTrack,
      setSelectedLoopSourceId:
        savedLibraryRemovalActions.setSelectedLoopSourceId,
      trackCount: savedLibrarySources.length,
    },
    playlists,
    search: {
      activeSearchQuery: driveLibrary.activeSearchQuery,
      canSearch: canRefresh,
      clearSearch: driveLibrary.clearSearch,
      commitSearchQuery: driveLibrary.commitSearchQuery,
      deactivateSearch: driveLibrary.deactivateSearch,
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
