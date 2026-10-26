import type { DriveAuthorizationState } from '@org/google-drive';
import { useMemo } from 'react';
import { Linking } from 'react-native';

import { useDriveLibrary } from '../drive/hooks/use-drive-library';
import { resolveDriveSourceActions } from '../drive/utils/drive-search-preview-actions';
import { usePreparedLoopBuilderTrack } from '../loops/hooks/use-prepared-loop-builder-track';
import { useSavedLoops } from '../loops/hooks/use-saved-loops';
import { useSourceLyrics } from '../lyrics/hooks/use-source-lyrics';
import { useSourceMarkers } from '../markers/hooks/use-source-markers';
import { useSourceSheetMusic } from '../sheet-music/hooks/use-source-sheet-music';
import type { useSavedTrackPlayback } from '../playback/hooks/use-saved-track-playback';
import { getSavedTrackPlaybackStatusCopy } from '../playback/utils/saved-track-playback-view-model';
import { useSavedPlaylists } from '../playlists/hooks/use-saved-playlists';
import {
  buildDriveDiscoveryView,
  buildDriveSearchView,
} from './build-drive-views';
import { createDriveImportControllerDependencies } from './drive-import-controller-dependencies';
import { resolveDriveStatusCopies } from './resolve-drive-status-copies';
import { saveDiscoveredDriveSource } from './save-discovered-drive-source';
import { useClearStaleLoopSource } from './use-clear-stale-loop-source';
import { useDriveImportController } from './use-drive-import-controller';
import { useLibraryFiles } from './use-library-files';
import { useSavedLibrarySourcesInView } from './use-saved-library-sources-in-view';
import { useOfflineRequestHandler } from '../offline/use-offline-request-handler';
import { useOpenLoopBuilderForSource } from './use-open-loop-builder-for-source';
import { useSavedRehearsalLibrary } from './use-saved-rehearsal-library';
import { useSavedRehearsalLibraryRemovalActions } from './use-saved-rehearsal-library-removal-actions';
import { useSavedSourceOriginalLocationActions } from './use-saved-source-original-location-actions';
import {
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
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
  onRequestAddDestination: () => void;
  playback: SavedTrackPlaybackController;
};

export const useRehearsalLibraryController = ({
  authState,
  googleAuthConfigured,
  onAuthorizationExpired,
  onAuthorizationRequired,
  onRequestAddDestination,
  playback,
}: RehearsalLibraryScreenControllerOptions) => {
  const driveLibrary = useDriveLibrary(
    authState,
    onAuthorizationExpired,
    onAuthorizationRequired,
  );
  const savedLibrary = useSavedRehearsalLibrary();
  const originalLocationActions = useSavedSourceOriginalLocationActions({
    accessToken:
      authState.status === 'authorized' ? authState.accessToken : undefined,
    canOpenUrl: (url) => Linking.canOpenURL(url),
    onOpenDriveFolder: driveLibrary.openFolder,
    onRequestAddDestination,
    onSaveSource: savedLibrary.saveSource,
    openUrl: (url) => Linking.openURL(url),
    savedSources: savedLibrary.savedSources,
  });
  const savedLoops = useSavedLoops();
  const sourceLyrics = useSourceLyrics(savedLibrary);
  const sourceSheetMusic = useSourceSheetMusic(savedLibrary);
  const sourceMarkers = useSourceMarkers({
    ...savedLibrary,
    savedLoops: savedLoops.savedLoops,
  });
  const playlists = useSavedPlaylists();
  const savedLibrarySources = useSavedLibrarySourcesInView({
    authState,
    driveLibrary,
    savedSources: savedLibrary.savedSources,
  });
  const libraryFiles = useLibraryFiles({
    refreshSavedLoops: savedLoops.refreshLoops,
    refreshSavedPlaylists: playlists.refreshPlaylists,
    refreshSavedSources: savedLibrary.refreshSources,
    savedLoops: savedLoops.savedLoops,
    savedPlaylists: playlists.savedPlaylists,
    savedSources: savedLibrarySources,
  });
  useOfflineRequestHandler({
    accessToken:
      authState.status === 'authorized' ? authState.accessToken : undefined,
    clearIssue: savedLibrary.clearOfflineIssue,
    reportIssue: savedLibrary.reportOfflineIssue,
    savedLibrarySources,
    savedLoops: savedLoops.savedLoops,
  });
  const savedLibraryRemovalActions = useSavedRehearsalLibraryRemovalActions({
    deleteLoop: savedLoops.deleteLoop,
    getTrackRemoveImpact: libraryFiles.getTrackRemoveFromLibraryImpact,
    refreshLoops: savedLoops.refreshLoops,
    refreshPlaylists: playlists.refreshPlaylists,
    removeSource: savedLibrary.removeSource,
  });
  const { selectedLoopSourceId, setSelectedLoopSourceId } =
    savedLibraryRemovalActions;

  useClearStaleLoopSource({
    isLibraryLoading: savedLibrary.isLoading,
    savedSources: savedLibrary.savedSources,
    selectedLoopSourceId,
    setSelectedLoopSourceId,
  });
  const canRefresh =
    authState.status === 'authorized' || authState.status === 'expired';
  const isSearchMode = driveLibrary.activeSearchQuery !== null;
  const { discoveryStatusCopy, searchStatusCopy } = resolveDriveStatusCopies({
    authState,
    driveLibrary,
    googleAuthConfigured,
    isSearchMode,
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
  const driveImportDependencies = useMemo(
    () =>
      createDriveImportControllerDependencies(
        authState.status === 'authorized' ? authState.accessToken : undefined,
      ),
    [authState],
  );
  const driveImport = useDriveImportController({
    dependencies: driveImportDependencies,
    async onLibraryChanged() {
      await Promise.all([
        libraryFiles.refresh(),
        savedLibrary.refreshSources(),
      ]);
    },
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
  const openLoopBuilderForSource = useOpenLoopBuilderForSource({
    accessToken: authState.accessToken,
    prepareLoopBuilderTrack,
    setSelectedLoopSourceId: savedLibraryRemovalActions.setSelectedLoopSourceId,
  });

  const getDriveSourceActions = (
    source: (typeof driveLibrary.browseSnapshot.playableSources)[number],
  ) => {
    const isSaved = savedSourceIds.has(source.id);
    const isPending = savedLibrary.pendingSourceId === source.id;

    const saveDiscoveredSource = () => {
      return saveDiscoveredDriveSource({
        consumePendingFolderId: libraryFiles.consumePendingDriveImportFolderId,
        linkSourceToFolder: libraryFiles.linkEntityToFolder,
        rootFolderId: libraryFiles.rootFolderId,
        saveSource: savedLibrary.saveSource,
        source,
      });
    };

    return resolveDriveSourceActions({
      activePlayableItem: playback.activePlayableItem,
      canMutateLibrary: savedLibrary.canMutateLibrary,
      isLibraryLoading: savedLibrary.isLoading,
      isLibraryMutating: savedLibrary.pendingSourceId !== null,
      isPreparingPlayback: playback.isPreparing,
      isSaved,
      isSavePending: isPending,
      onOpenInGoogleDrive: () => {
        originalLocationActions.openDriveSourceFileInGoogleDrive(source);
      },
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
    driveImport,
    discovery: buildDriveDiscoveryView({
      canRefresh,
      driveLibrary,
      isSearchMode,
      statusCopy: discoveryStatusCopy,
    }),
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
    originalLocation: {
      clearSourceLocationIssue:
        originalLocationActions.clearSourceLocationIssue,
      openSourceInGoogleDrive: originalLocationActions.openSourceInGoogleDrive,
      pendingSourceLocationAction:
        originalLocationActions.pendingSourceLocationAction,
      showSourceInAdd: originalLocationActions.showSourceInAdd,
      sourceLocationIssue: originalLocationActions.sourceLocationIssue,
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
      removeSourceWithoutConfirmation:
        savedLibraryRemovalActions.removeSourceWithoutConfirmation,
      files: libraryFiles,
      savedLibraryIssue: savedLibrary.issue,
      savedLibrarySources,
      savedLoopIssue: savedLoops.issue,
      savedLoops: savedLoops.savedLoops,
      savedLibraryStatusCopy,
      lyrics: sourceLyrics,
      markers: sourceMarkers,
      sheetMusic: sourceSheetMusic,
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
    search: buildDriveSearchView({
      canRefresh,
      driveLibrary,
      isSearchMode,
      statusCopy: searchStatusCopy,
    }),
  };
};
