import { StyleSheet, View } from 'react-native';

import type { useRehearsalLibraryScreenController } from '../hooks/use-rehearsal-library-screen-controller';
import {
  shouldShowDriveStatusCard,
  shouldShowUnavailableSources,
} from '../utils/add-drive-layout';
import { DriveFolderGroup } from './DriveFolderGroup';
import { DriveLibraryBreadcrumbs } from './DriveLibraryBreadcrumbs';
import { DriveLibraryRootSelector } from './DriveLibraryRootSelector';
import { DriveLibrarySearchPanel } from './DriveLibrarySearchPanel';
import { DriveLibrarySectionHeader } from './DriveLibrarySectionHeader';
import { DriveLibrarySourceGroup } from './DriveLibrarySourceGroup';
import { DriveLibraryStatusCard } from './DriveLibraryStatusCard';

type DriveDiscoveryPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryScreenController>;
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
        eyebrow="Discovery"
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
        isSearchMode={controller.search.isSearchMode}
        onClearSearch={controller.search.clearSearch}
        onSearch={controller.search.submitSearch}
        onSearchQueryChange={controller.search.setSearchQuery}
        onSelectRecentSearchTerm={controller.search.submitSearchQuery}
        placeholderCopy={controller.search.searchContextCopy.placeholder}
        recentSearchTerms={controller.search.recentSearchTerms}
        searchQuery={controller.search.searchQuery}
      />
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
        getAction={controller.getSourceAction}
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
