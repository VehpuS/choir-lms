import { StyleSheet, View } from 'react-native';

import {
  ExplorerBreadcrumbBar,
  ExplorerNavigationBar,
} from '../../components/explorer';
import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import { buildDriveDiscoveryPanelViewModel } from './drive-discovery-panel-view-model';
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
  const viewModel = buildDriveDiscoveryPanelViewModel({
    controller,
  });

  const searchPanel = (
    <DriveLibrarySearchPanel
      canSearch={controller.search.canSearch}
      helperCopy={controller.search.searchContextCopy.helper}
      isLoading={controller.search.isLoading}
      isSearchBarVisible={isSearchBarVisible}
      onClearSearch={controller.search.clearSearch}
      onSearch={controller.search.submitSearch}
      onSearchInputBlur={controller.search.commitSearchQuery}
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
        isSearchMode={viewModel.isSearchMode}
        onSelectRoot={controller.discovery.selectRoot}
      />
      <ExplorerNavigationBar
        canGoBack={controller.discovery.navigationStack.length > 1}
        eyebrow={viewModel.navigationEyebrow}
        onGoBack={viewModel.onGoBack}
        title={viewModel.currentTitle}
      />
      <ExplorerBreadcrumbBar items={viewModel.breadcrumbs} />
      {viewModel.shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={viewModel.isStatusLoading}
          loadingLabel={
            viewModel.isSearchMode ? 'Searching Google Drive…' : undefined
          }
          statusCopy={viewModel.activeStatusCopy}
        />
      ) : null}
      <DriveExplorerList
        getActions={controller.getDriveSourceActions}
        getMessage={controller.getSourceMessage}
        highlightQuery={viewModel.highlightQuery}
        onOpenFolder={viewModel.onOpenFolder}
        rows={viewModel.explorerRows}
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
