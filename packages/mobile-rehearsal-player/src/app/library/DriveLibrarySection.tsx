import type { DriveAuthorizationState } from '@org/google-drive';
import { StyleSheet, View } from 'react-native';

import { DriveFolderGroup } from './DriveFolderGroup';
import { DriveLibraryBreadcrumbs } from './DriveLibraryBreadcrumbs';
import { DriveLibraryRootSelector } from './DriveLibraryRootSelector';
import { DriveLibrarySearchPanel } from './DriveLibrarySearchPanel';
import { DriveLibrarySectionHeader } from './DriveLibrarySectionHeader';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';
import { getDriveLibraryStatusCopy } from './drive-library-view-model';
import {
  getSavedRehearsalLibrarySourceIssue,
  getSavedRehearsalLibraryStatusCopy,
  resolveSavedRehearsalLibrarySources,
} from './saved-rehearsal-library-view-model';
import {
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackSourceIssue,
  getSavedTrackPlaybackStatusCopy,
  isSavedTrackPlaybackActive,
  isSavedTrackPlaybackBusy,
} from './saved-track-playback-view-model';
import { useDriveLibrary } from './use-drive-library';
import { useSavedRehearsalLibrary } from './use-saved-rehearsal-library';
import { useSavedTrackPlayback } from './use-saved-track-playback';

type DriveLibrarySectionProps = {
  authState: DriveAuthorizationState;
  googleAuthConfigured: boolean;
};

const BORDER_COLOR = '#d6d1c4';
const CARD_BACKGROUND = '#fffdf8';

export const DriveLibrarySection = ({
  authState,
  googleAuthConfigured,
}: DriveLibrarySectionProps) => {
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
    activePlayableItem,
    isPreparing: isPlaybackPreparing,
    issue: playbackIssue,
    playbackState,
    progress,
    toggleSourcePlayback,
  } = useSavedTrackPlayback(authState);
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
  const isSavedTrackPlaybackLoading = isSavedTrackPlaybackBusy({
    isPreparing: isPlaybackPreparing,
    playbackState,
  });
  const savedSourceTitle = `Saved rehearsal tracks (${savedLibrarySources.length})`;

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

      <View style={styles.savedLibrarySection}>
        <DriveLibrarySectionHeader
          canRefresh={false}
          isLoading={false}
          onRefresh={() => {
            return undefined;
          }}
          title="Saved rehearsal library"
          body="Keep explicit Google Drive references ready for full-track playback, loops, and playlists without copying the source media."
          eyebrow="Saved tracks"
        />

        <DriveLibraryStatusCard
          isLoading={isSavedLibraryLoading}
          loadingLabel="Refreshing saved rehearsal tracks…"
          statusCopy={savedLibraryStatusCopy}
        />

        {savedTrackPlaybackStatusCopy ? (
          <DriveLibraryStatusCard
            isLoading={isSavedTrackPlaybackLoading}
            loadingLabel="Starting track playback…"
            statusCopy={savedTrackPlaybackStatusCopy}
          />
        ) : null}

        <DriveLibrarySourceGroup
          getActions={(source) => {
            const isPending = pendingSourceId === source.id;
            const playbackAction = getSavedTrackPlaybackActionCopy({
              activePlayableItem,
              isPreparing: isPlaybackPreparing,
              playbackState,
              source,
            });
            const isPlaybackSourceActive = isSavedTrackPlaybackActive(
              activePlayableItem,
              source,
            );

            return [
              {
                disabled: isSavedLibraryMutating || playbackAction.disabled,
                label: playbackAction.label,
                onPress: () => {
                  void toggleSourcePlayback(source);
                },
                tone: 'primary' as const,
              },
              {
                disabled:
                  !canMutateLibrary ||
                  isSavedLibraryMutating ||
                  isPlaybackSourceActive,
                label: isPending ? 'Removing…' : 'Remove',
                onPress: () => {
                  void removeSource(source);
                },
              },
            ];
          }}
          getMessage={(source) => {
            return (
              getSavedRehearsalLibrarySourceIssue(
                savedLibraryIssue,
                source,
                'remove',
              ) ?? getSavedTrackPlaybackSourceIssue(playbackIssue, source)
            );
          }}
          sources={savedLibrarySources}
          title={savedSourceTitle}
        />
      </View>

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
                void removeSource(source);
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
  savedLibrarySection: {
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderRadius: 16,
    backgroundColor: '#faf6ee',
  },
});
