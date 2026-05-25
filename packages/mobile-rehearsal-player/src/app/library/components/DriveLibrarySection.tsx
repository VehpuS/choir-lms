import type { DriveAuthorizationState } from '@org/google-drive';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { useSavedTrackPlayback } from '../hooks/use-saved-track-playback';

import { DriveFolderGroup } from './DriveFolderGroup';
import { DriveLibraryBreadcrumbs } from './DriveLibraryBreadcrumbs';
import { DriveLibraryRootSelector } from './DriveLibraryRootSelector';
import { DriveLibrarySearchPanel } from './DriveLibrarySearchPanel';
import { DriveLibrarySectionHeader } from './DriveLibrarySectionHeader';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { SavedRehearsalLibrarySection } from './SavedRehearsalLibrarySection';
import { getDriveLibraryStatusCopy } from '../utils/drive-library-view-model';
import {
  getSavedLoopRemovalCopy,
  resolveLoopBuilderTrack,
} from '../utils/saved-loop-view-model';
import {
  getSavedRehearsalLibraryDependentLoops,
  getSavedRehearsalLibraryRemovalCopy,
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from '../utils/saved-rehearsal-library-view-model';
import { getSavedTrackPlaybackStatusCopy } from '../utils/saved-track-playback-view-model';
import { useDriveLibrary } from '../hooks/use-drive-library';
import { useSavedLoops } from '../hooks/use-saved-loops';
import { useSavedRehearsalLibrary } from '../hooks/use-saved-rehearsal-library';

type SavedTrackPlaybackController = Pick<
  ReturnType<typeof useSavedTrackPlayback>,
  | 'activePlayableItem'
  | 'isPreparing'
  | 'issue'
  | 'playbackState'
  | 'progress'
  | 'togglePlayableItemPlayback'
  | 'toggleSourcePlayback'
>;

type DriveLibrarySectionProps = {
  authState: DriveAuthorizationState;
  googleAuthConfigured: boolean;
} & SavedTrackPlaybackController;

const BORDER_COLOR = '#d6d1c4';
const CARD_BACKGROUND = '#fffdf8';

export const DriveLibrarySection = ({
  activePlayableItem,
  authState,
  googleAuthConfigured,
  isPreparing: isPlaybackPreparing,
  issue: playbackIssue,
  playbackState,
  progress,
  togglePlayableItemPlayback,
  toggleSourcePlayback,
}: DriveLibrarySectionProps) => {
  const [selectedLoopSourceId, setSelectedLoopSourceId] = useState<
    string | null
  >(null);
  const {
    activeSearchQuery,
    browseSnapshot,
    clearSearch,
    currentLocation,
    goToLocation,
    isLoading,
    issue,
    navigationStack,
    openFolder,
    playableSources,
    refresh,
    searchQuery,
    searchSnapshot,
    selectRoot,
    setSearchQuery,
    submitSearch,
    unavailableSources,
  } = useDriveLibrary(authState);
  const {
    canMutateLibrary,
    isLoading: isSavedLibraryLoading,
    issue: savedLibraryIssue,
    pendingSourceId,
    removeSource,
    savedSources,
    saveSource,
  } = useSavedRehearsalLibrary();
  const {
    canMutateLoops,
    deleteLoop,
    isLoading: isSavedLoopsLoading,
    issue: savedLoopIssue,
    pendingLoopId,
    refreshLoops,
    saveLoop,
    savedLoops,
  } = useSavedLoops();
  const statusCopy = getDriveLibraryStatusCopy({
    authState,
    activeSearchQuery,
    browseSnapshot,
    googleAuthConfigured,
    isLoading,
    issue,
    searchSnapshot,
  });
  const canRefresh = authState.status === 'authorized';
  const isSearchMode = activeSearchQuery !== null;
  const folderTitle =
    currentLocation.rootKind === 'shared' && currentLocation.kind === 'root'
      ? `Shared folders (${browseSnapshot.folders.length})`
      : `Folders (${browseSnapshot.folders.length})`;
  const playableSourceTitle = isSearchMode
    ? `Matching audio (${playableSources.length})`
    : `Audio in ${currentLocation.name} (${playableSources.length})`;
  const unavailableSourceTitle = isSearchMode
    ? `Unavailable or unsupported results (${unavailableSources.length})`
    : `Unavailable or unsupported in ${currentLocation.name} (${unavailableSources.length})`;
  const savedLibrarySources = resolveSavedRehearsalLibrarySources({
    authState,
    savedSources,
    visibleSources: [...playableSources, ...unavailableSources],
  });
  const savedSourceIds = new Set(savedSources.map((source) => source.id));
  const savedLibraryStatusCopy = getSavedRehearsalLibraryStatusCopy({
    authState,
    isLoading: isSavedLibraryLoading,
    issue: savedLibraryIssue,
    savedSources: savedLibrarySources,
  });
  const savedTrackPlaybackStatusCopy = getSavedTrackPlaybackStatusCopy({
    activePlayableItem,
    durationSeconds: progress.duration,
    isPreparing: isPlaybackPreparing,
    issue: playbackIssue,
    playbackState,
    positionSeconds: progress.position,
  });
  const isSavedLibraryMutating = pendingSourceId !== null;
  const selectedLoopTrack = resolveLoopBuilderTrack({
    activePlayableItem,
    savedSources: savedLibrarySources,
    selectedSourceId: selectedLoopSourceId,
  });

  const confirmRemoveSource = (
    source: (typeof savedLibrarySources)[number],
  ) => {
    const removalCopy = getSavedRehearsalLibraryRemovalCopy({
      dependentLoops: getSavedRehearsalLibraryDependentLoops(
        savedLoops,
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
            const didRemove = await removeSource(source);

            if (!didRemove) {
              return;
            }

            if (selectedLoopSourceId === source.id) {
              setSelectedLoopSourceId(null);
            }

            await refreshLoops();
          })();
        },
      },
    ]);
  };

  const confirmRemoveLoop = (loop: (typeof savedLoops)[number]) => {
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
          void deleteLoop(loop);
        },
      },
    ]);
  };

  return (
    <View style={styles.section}>
      <DriveLibrarySectionHeader
        canRefresh={canRefresh}
        isLoading={isLoading}
        onRefresh={refresh}
      />
      <DriveLibrarySearchPanel
        canSearch={canRefresh}
        isLoading={isLoading}
        isSearchMode={isSearchMode}
        onClearSearch={clearSearch}
        onSearch={submitSearch}
        onSearchQueryChange={setSearchQuery}
        searchQuery={searchQuery}
      />
      <DriveLibraryRootSelector
        currentRootKind={currentLocation.rootKind}
        isSearchMode={isSearchMode}
        onSelectRoot={selectRoot}
      />
      {!isSearchMode ? (
        <DriveLibraryBreadcrumbs
          navigationStack={navigationStack}
          onGoToLocation={goToLocation}
        />
      ) : null}
      <DriveLibraryStatusCard isLoading={isLoading} statusCopy={statusCopy} />
      <SavedRehearsalLibrarySection
        activePlayableItem={activePlayableItem}
        canMutateLibrary={canMutateLibrary}
        canMutateLoops={canMutateLoops}
        isPlaybackPreparing={isPlaybackPreparing}
        isSavedLibraryLoading={isSavedLibraryLoading}
        isSavedLoopsLoading={isSavedLoopsLoading}
        pendingSourceId={pendingSourceId}
        pendingLoopId={pendingLoopId}
        playbackIssue={playbackIssue}
        playbackState={playbackState}
        positionSeconds={progress.position}
        removeLoop={confirmRemoveLoop}
        removeSource={confirmRemoveSource}
        savedLibraryIssue={savedLibraryIssue}
        savedLibrarySources={savedLibrarySources}
        savedLoopIssue={savedLoopIssue}
        savedLoops={savedLoops}
        savedLibraryStatusCopy={savedLibraryStatusCopy}
        saveLoop={saveLoop}
        savedTrackPlaybackStatusCopy={savedTrackPlaybackStatusCopy}
        selectedLoopSourceId={selectedLoopSourceId}
        selectedTrack={selectedLoopTrack}
        setSelectedLoopSourceId={setSelectedLoopSourceId}
        togglePlayableItemPlayback={togglePlayableItemPlayback}
        toggleSourcePlayback={toggleSourcePlayback}
      />
      {!isSearchMode ? (
        <DriveFolderGroup
          folders={browseSnapshot.folders}
          onOpenFolder={openFolder}
          title={folderTitle}
        />
      ) : null}
      <DriveLibrarySourceGroup
        getAction={(source) => {
          const isSaved = savedSourceIds.has(source.id);
          const isPending = pendingSourceId === source.id;

          return {
            disabled:
              !canMutateLibrary ||
              isSavedLibraryLoading ||
              isSavedLibraryMutating,
            label: isPending
              ? isSaved
                ? 'Removing…'
                : 'Saving…'
              : isSaved
                ? 'Remove'
                : 'Save',
            onPress: () => {
              if (isSaved) {
                confirmRemoveSource(source);
                return;
              }
              void saveSource(source);
            },
          };
        }}
        getMessage={(source) => {
          return getSavedRehearsalLibrarySourceIssue(
            savedLibraryIssue,
            source,
            'save',
          );
        }}
        sources={playableSources}
        title={playableSourceTitle}
      />
      <DriveLibrarySourceGroup
        sources={unavailableSources}
        title={unavailableSourceTitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 20,
    backgroundColor: CARD_BACKGROUND,
  },
});
