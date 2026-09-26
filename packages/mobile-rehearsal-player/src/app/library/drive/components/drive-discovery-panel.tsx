import { StyleSheet, View } from 'react-native';

import {
  ExplorerBreadcrumbBar,
  ExplorerNavigationBar,
} from '../../components/explorer';
import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import { buildDriveDiscoveryPanelViewModel } from './drive-discovery-panel-view-model';
import { DriveExplorerList } from './drive-explorer-list';
import { resolveDriveDiscoveryResultFromRow } from './drive-explorer-row-model';
import { DriveLibraryRootSelector } from './drive-library-root-selector';
import { DriveLibrarySearchPanel } from './drive-library-search-panel';
import { DriveLibraryStatusCard } from './drive-library-status-card';
import { DriveSearchSelectionToolbar } from './drive-search-selection-toolbar';
import { appTheme } from '../../../utils/theme';

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
        actionLabel="Search results"
        canGoBack={controller.discovery.navigationStack.length > 1}
        eyebrow={viewModel.navigationEyebrow}
        onAction={viewModel.onReturnToSearchResults}
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
      {viewModel.isSearchMode ? (
        <DriveSearchSelectionToolbar
          canSelectAll={controller.search.selection.canSelectAll}
          isActive={controller.search.selection.isActive}
          isReviewReady={controller.search.selection.isReviewReady}
          isSelectingAll={controller.search.selection.isSelectingAll}
          onCancel={controller.search.selection.cancel}
          onContinue={controller.search.selection.continueToReview}
          onEdit={controller.search.selection.edit}
          onEnter={controller.search.selection.enter}
          onSelectAll={controller.search.selection.selectAll}
          resultCount={viewModel.selectionResultCount}
          selectedCount={controller.search.selection.selectedCount}
        />
      ) : null}
      <DriveExplorerList
        getActions={controller.getDriveSourceActions}
        getMessage={controller.getSourceMessage}
        highlightQuery={viewModel.highlightQuery}
        isSelectionMode={controller.search.selection.isActive}
        onOpenFolder={viewModel.onOpenFolder}
        onToggleSelection={(row) => {
          controller.search.selection.toggle(
            resolveDriveDiscoveryResultFromRow(row),
          );
        }}
        rows={viewModel.explorerRows}
        selectedResultIds={controller.search.selection.selectedResultIds}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: appTheme.colors.border,
    borderRadius: 20,
    backgroundColor: appTheme.colors.surface,
  },
});
