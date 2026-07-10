import { StyleSheet, View } from 'react-native';

import {
  ExplorerBreadcrumbBar,
  ExplorerNavigationBar,
} from '../../components/explorer';
import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import { shouldShowDriveStatusCard } from '../utils/drive-discovery-layout';
import {
  buildDriveDiscoveryExplorerState,
  type DriveDiscoveryExplorerState,
} from './drive-discovery-panel-model';
import { DriveExplorerList } from './drive-explorer-list';
import { DriveLibraryRootSelector } from './drive-library-root-selector';
import { DriveLibrarySearchPanel } from './drive-library-search-panel';
import { DriveLibraryStatusCard } from './drive-library-status-card';

type DriveDiscoveryPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryController>;
  isSearchBarVisible: boolean;
  onToggleSearchBar: () => void;
};

export const DriveDiscoveryPanel = ({
  controller,
  isSearchBarVisible,
  onToggleSearchBar,
}: DriveDiscoveryPanelProps) => {
  const isSearchMode = controller.search.isSearchMode;
  const explorerState = buildDriveDiscoveryExplorerState({
    browseFolders: controller.discovery.browseSnapshot.folders,
    browsePlayableSources: controller.discovery.playableSources,
    browseUnavailableSources: controller.discovery.unavailableSources,
    currentLocation: controller.discovery.currentLocation,
    isSearchMode,
    navigationStack: controller.discovery.navigationStack,
    searchPlayableSources: controller.search.playableSources,
    searchUnavailableSources: controller.search.unavailableSources,
  });
  const activeStatusCopy = isSearchMode
    ? controller.search.statusCopy
    : controller.discovery.statusCopy;
  const isStatusLoading = isSearchMode
    ? controller.search.isLoading
    : controller.discovery.isLoading;
  const shouldShowStatusCard = shouldShowDriveStatusCard(
    isStatusLoading,
    activeStatusCopy.tone,
  );
  const parentLocationIndex = controller.discovery.navigationStack.length - 2;

  const searchPanel = (
    <DriveLibrarySearchPanel
      canSearch={controller.search.canSearch}
      helperCopy={controller.search.searchContextCopy.helper}
      isLoading={controller.search.isLoading}
      isSearchBarVisible={isSearchBarVisible}
      onClearSearch={controller.search.clearSearch}
      onSearch={controller.search.submitSearch}
      onSearchQueryChange={controller.search.setSearchQuery}
      onSelectRecentSearchTerm={controller.search.submitSearchQuery}
      onToggleSearchBar={onToggleSearchBar}
      placeholderCopy={controller.search.searchContextCopy.placeholder}
      recentSearchTerms={controller.search.recentSearchTerms}
      searchQuery={controller.search.searchQuery}
      showInlineToggleButton={false}
    />
  );

  return (
    <View style={styles.section}>
      {isSearchBarVisible ? searchPanel : null}
      <DriveLibraryRootSelector
        currentRootKind={controller.discovery.currentLocation.rootKind}
        isSearchMode={isSearchMode}
        onSelectRoot={controller.discovery.selectRoot}
      />
      <ExplorerNavigationBar
        canGoBack={explorerState.canGoBack}
        eyebrow={isSearchMode ? 'Current search scope' : 'Current location'}
        onGoBack={() => {
          if (parentLocationIndex < 0) {
            return;
          }

          controller.discovery.goToLocation(parentLocationIndex);
        }}
        title={explorerState.currentTitle}
      />
      <ExplorerBreadcrumbBar
        items={explorerState.breadcrumbs.map(
          (breadcrumb: DriveDiscoveryExplorerState['breadcrumbs'][number]) => {
            return {
              isCurrent: breadcrumb.isCurrent,
              key: breadcrumb.key,
              label: breadcrumb.label,
              onPress: breadcrumb.isCurrent
                ? undefined
                : () => {
                    controller.discovery.goToLocation(breadcrumb.locationIndex);
                  },
            };
          },
        )}
      />
      {shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={isStatusLoading}
          loadingLabel={isSearchMode ? 'Searching Google Drive…' : undefined}
          statusCopy={activeStatusCopy}
        />
      ) : null}
      <DriveExplorerList
        getActions={controller.getDriveSourceActions}
        getMessage={controller.getSourceMessage}
        highlightQuery={
          isSearchMode ? controller.search.activeSearchQuery : null
        }
        onOpenFolder={controller.discovery.openFolder}
        rows={explorerState.rows}
      />
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
