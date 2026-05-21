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
import { useDriveLibrary } from './use-drive-library';

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

      {!isSearchMode ? (
        <DriveFolderGroup
          folders={browseSnapshot.folders}
          onOpenFolder={openFolder}
          title={folderTitle}
        />
      ) : null}

      <DriveLibrarySourceGroup
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
