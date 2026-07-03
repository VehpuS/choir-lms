import { StyleSheet, View } from 'react-native';

import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import {
  shouldShowDriveStatusCard,
  shouldShowUnavailableSources,
} from '../utils/drive-discovery-layout';
import { DriveFolderGroup } from './drive-folder-group';
import { DriveLibraryBreadcrumbs } from './drive-library-breadcrumbs';
import { DriveLibraryRootSelector } from './drive-library-root-selector';
import { DriveLibrarySearchPanel } from './drive-library-search-panel';
import { DriveLibrarySectionHeader } from './drive-library-section-header';
import { DriveLibrarySourceGroup } from './drive-library-source-group';
import { DriveLibraryStatusCard } from './drive-library-status-card';
import { DriveSearchResultsPanel } from './drive-search-results-panel';

type DriveDiscoveryPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryController>;
};

export const DriveDiscoveryPanel = ({
  controller,
}: DriveDiscoveryPanelProps) => {
  const shouldShowStatusCard = shouldShowDriveStatusCard(
    controller.discovery.isLoading,
    controller.discovery.statusCopy.tone,
  );

  return (
    <View style={styles.section}>
      <DriveLibrarySectionHeader
        canRefresh={controller.discovery.canRefresh}
        isLoading={controller.discovery.isLoading}
        onRefresh={controller.discovery.refresh}
        title="Browse Drive"
      />
      <DriveLibraryRootSelector
        currentRootKind={controller.discovery.currentLocation.rootKind}
        isSearchMode={false}
        onSelectRoot={controller.discovery.selectRoot}
      />
      <DriveLibraryBreadcrumbs
        navigationStack={controller.discovery.navigationStack}
        onGoToLocation={controller.discovery.goToLocation}
      />
      <DriveLibrarySearchPanel
        canSearch={controller.search.canSearch}
        helperCopy={controller.search.searchContextCopy.helper}
        isLoading={controller.search.isLoading}
        onClearSearch={controller.search.clearSearch}
        onSearch={controller.search.submitSearch}
        onSearchQueryChange={controller.search.setSearchQuery}
        onSelectRecentSearchTerm={controller.search.submitSearchQuery}
        placeholderCopy={controller.search.searchContextCopy.placeholder}
        recentSearchTerms={controller.search.recentSearchTerms}
        searchQuery={controller.search.searchQuery}
      />
      <DriveSearchResultsPanel controller={controller} />
      {!controller.search.isSearchMode ? (
        <>
          {shouldShowStatusCard ? (
            <DriveLibraryStatusCard
              isLoading={controller.discovery.isLoading}
              statusCopy={controller.discovery.statusCopy}
            />
          ) : null}
          <DriveFolderGroup
            folders={controller.discovery.browseSnapshot.folders}
            onOpenFolder={controller.discovery.openFolder}
            title={controller.discovery.folderTitle}
          />
          <DriveLibrarySourceGroup
            getActions={controller.getDriveSourceActions}
            getMessage={controller.getSourceMessage}
            sources={controller.discovery.playableSources}
            title={controller.discovery.playableSourceTitle}
          />
          {shouldShowUnavailableSources(
            controller.discovery.unavailableSources.length,
          ) ? (
            <DriveLibrarySourceGroup
              sources={controller.discovery.unavailableSources}
              title={controller.discovery.unavailableSourceTitle}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#d6d1c4',
    borderRadius: 20,
    backgroundColor: '#fffdf8',
  },
});
