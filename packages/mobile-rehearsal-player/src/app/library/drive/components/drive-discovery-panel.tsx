import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ExplorerBreadcrumbBar,
  ExplorerNavigationBar,
} from '../../components/explorer';
import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import { buildDriveDiscoveryPanelViewModel } from './drive-discovery-panel-view-model';
import { DriveExplorerList } from './drive-explorer-list';
import { DriveExplorerLoadingRows } from './drive-explorer-loading-rows';
import { buildDriveRowSelection } from './drive-discovery-panel-selection';
import { DriveLibraryRootSelector } from './drive-library-root-selector';
import { DriveLibrarySearchPanel } from './drive-library-search-panel';
import { DriveSearchSummaryLine } from './drive-search-summary-line';
import { DriveLibraryStatusCard } from './drive-library-status-card';
import { SurfaceIconButton } from '../../../components/surface-icon-button';
import { appTheme } from '../../../utils/theme';
import type { BulkAction } from '../../selection/bulk-action-model';
import {
  SELECTION_COPY,
  getSelectionCountLabel,
} from '../../selection/selection-copy';
import { SelectionBar } from '../../selection/selection-bar';
import { usePinnedBulkActionBar } from '../../selection/use-pinned-bulk-action-bar';

type DriveDiscoveryPanelProps = {
  controller: ReturnType<typeof useRehearsalLibraryController>;
  /** Whether Add is the visible destination; the pinned bar only shows then. */
  isDestinationActive: boolean;
  isSearchBarVisible: boolean;
  onToggleSearchBar: () => void;
};

export const DriveDiscoveryPanel = ({
  controller,
  isDestinationActive,
  isSearchBarVisible,
  onToggleSearchBar,
}: DriveDiscoveryPanelProps) => {
  const viewModel = buildDriveDiscoveryPanelViewModel({
    controller,
  });

  const selection = controller.search.selection;
  const bulkBar = useMemo(() => {
    if (!selection.isActive || !isDestinationActive) {
      return null;
    }

    const actions: BulkAction[] = [
      {
        disabledReason: selection.isSelectingAll
          ? 'Still gathering matching results.'
          : 'Select at least one folder or audio file first.',
        id: 'continue',
        isDisabled: selection.selectedCount === 0 || selection.isSelectingAll,
        label: SELECTION_COPY.continue,
        onPress: selection.continueToReview,
        tone: 'accent',
      },
      {
        disabledReason: 'Nothing is selected.',
        id: 'clear',
        isDisabled: selection.selectedCount === 0,
        label: SELECTION_COPY.clear,
        onPress: selection.clear,
      },
    ];

    return {
      actions,
      overflowTitle: getSelectionCountLabel(selection.selectedCount),
    };
  }, [
    isDestinationActive,
    selection.clear,
    selection.continueToReview,
    selection.isActive,
    selection.isSelectingAll,
    selection.selectedCount,
  ]);

  usePinnedBulkActionBar(bulkBar);

  // One entry point for browse and search: an icon in the navigation bar, so
  // it costs no row of its own.
  const canEnterSelection =
    !selection.isActive &&
    selection.canSelect &&
    (viewModel.isSearchMode
      ? viewModel.selectionResultCount > 0
      : viewModel.explorerRows.length > 0);

  // Search results and browsed rows are both selectable; the basket spans them.
  const listSelection = selection.canSelect
    ? buildDriveRowSelection({
        isSearchMode: viewModel.isSearchMode,
        navigationStack: controller.discovery.navigationStack,
        rows: viewModel.explorerRows,
        selection,
      })
    : undefined;

  const searchPanel = (
    <DriveLibrarySearchPanel
      canSearch={controller.search.canSearch}
      inputAccessibilityLabel={controller.search.searchContextCopy.helper}
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
      <DriveLibraryRootSelector
        currentRootKind={controller.discovery.currentLocation.rootKind}
        onSelectRoot={controller.discovery.selectRoot}
      />
      {/* Under the root switcher so the scope it searches is implied. */}
      {isSearchBarVisible ? searchPanel : null}
      <ExplorerNavigationBar
        actionLabel="Search results"
        canGoBack={controller.discovery.navigationStack.length > 1}
        eyebrow={viewModel.navigationEyebrow}
        onAction={viewModel.onReturnToSearchResults}
        onGoBack={viewModel.onGoBack}
        title={viewModel.currentTitle}
        trailingAction={
          canEnterSelection ? (
            <SurfaceIconButton
              accessibilityLabel={SELECTION_COPY.enter}
              icon="select-multiple"
              onPress={selection.enter}
            />
          ) : undefined
        }
      />
      {viewModel.breadcrumbs.length > 1 ? (
        <ExplorerBreadcrumbBar items={viewModel.breadcrumbs} />
      ) : null}
      {viewModel.shouldShowStatusCard ? (
        <DriveLibraryStatusCard
          isLoading={viewModel.isStatusLoading}
          statusCopy={viewModel.activeStatusCopy}
        />
      ) : null}
      {viewModel.searchSummary ? (
        <DriveSearchSummaryLine
          onRetry={controller.search.submitSearch}
          summary={viewModel.searchSummary}
        />
      ) : null}
      {selection.isActive ? (
        // Shown wherever the basket is active: a scope change keeps the
        // basket, so its count, `Select all` and `Cancel` stay reachable.
        <SelectionBar
          busyLabel="Selecting all matching Drive results"
          helperText={
            selection.isSelectingAll
              ? 'Selecting every matching result…'
              : 'Selected folders include everything inside them. Tap a folder’s arrow to open it.'
          }
          isBusy={selection.isSelectingAll}
          onCancel={selection.cancel}
          selectAll={{
            // Stays pressable while gathering so `Deselect all` can stop it.
            isAllSelected: selection.isAllSelected,
            isDisabled: !selection.isAllSelected && !selection.canSelectAll,
            onToggle: selection.toggleAll,
          }}
          selectedCount={selection.selectedCount}
        />
      ) : null}
      {viewModel.shouldShowLoadingRows ? (
        <View
          accessibilityLabel="Loading"
          accessibilityLiveRegion="polite"
          accessibilityState={{ busy: true }}
        >
          <DriveExplorerLoadingRows />
        </View>
      ) : (
        <DriveExplorerList
          getActions={controller.getDriveSourceActions}
          getMessage={controller.getSourceMessage}
          highlightQuery={viewModel.highlightQuery}
          onOpenFolder={viewModel.onOpenFolder}
          rows={viewModel.explorerRows}
          selection={listSelection}
        />
      )}
    </View>
  );
};

// Add sits on the ground like the Library views (screen 1e): no panel card.
// A one-location breadcrumb would only repeat the navigation title.
const styles = StyleSheet.create({
  section: {
    gap: appTheme.space.md,
  },
});
