import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveBrowseLocation } from '@org/google-drive';

import type { useRehearsalLibraryController } from '../../saved-rehearsal-library/use-rehearsal-library-controller';
import { buildDriveDiscoveryPanelViewModel } from './drive-discovery-panel-view-model';

const ROOT_LOCATION: DriveBrowseLocation = {
  id: 'root:my-drive',
  kind: 'root',
  name: 'Warmups Root',
  rootKind: 'my-drive',
};

const CURRENT_LOCATION: DriveBrowseLocation = {
  id: 'folder-1',
  kind: 'folder',
  name: 'Warmups',
  rootKind: 'my-drive',
};

describe('DriveDiscoveryPanel', () => {
  it('keeps Add explorer navigation on the same stack for back, breadcrumbs, and folders', () => {
    const goToLocationCalls: number[] = [];
    const openedFolderIds: string[] = [];
    let returnToSearchResultsCallCount = 0;
    const controller = {
      discovery: {
        browseSnapshot: {
          folders: [
            {
              id: 'folder-2',
              modifiedTime: '2026-07-10T00:00:00.000Z',
              name: 'Alto Section',
              rootKind: 'my-drive',
              shared: false,
            },
          ],
          playableSources: [],
          unavailableSources: [],
        },
        canReturnToSearchResults: true,
        currentLocation: CURRENT_LOCATION,
        goToLocation(locationIndex: number) {
          goToLocationCalls.push(locationIndex);
        },
        isLoading: false,
        navigationStack: [ROOT_LOCATION, CURRENT_LOCATION],
        openFolder(folder: { id: string }) {
          openedFolderIds.push(folder.id);
        },
        playableSources: [],
        returnToSearchResults() {
          returnToSearchResultsCallCount += 1;
        },
        selectRoot: () => undefined,
        statusCopy: {
          message: 'Browse Google Drive folders and audio.',
          title: 'Drive ready',
          tone: 'neutral',
        },
        unavailableSources: [],
      },
      getDriveSourceActions: () => [],
      getSourceMessage: () => undefined,
      search: {
        activeSearchQuery: null,
        canSearch: true,
        clearSearch: () => undefined,
        isLoading: false,
        isSearchMode: false,
        playableSources: [],
        recentSearchTerms: [],
        results: [],
        searchContextCopy: {
          helper: 'Search Google Drive',
          placeholder: 'Search Google Drive',
        },
        searchQuery: '',
        selection: { canSelect: false },
        setSearchQuery: () => undefined,
        statusCopy: {
          message: 'Search Google Drive',
          title: 'Search ready',
          tone: 'neutral',
        },
        submitSearch: () => undefined,
        submitSearchQuery: () => undefined,
        unavailableSources: [],
      },
    } as unknown as ReturnType<typeof useRehearsalLibraryController>;

    const viewModel = buildDriveDiscoveryPanelViewModel({
      controller,
    });

    viewModel.onGoBack();
    viewModel.onReturnToSearchResults?.();
    viewModel.breadcrumbs[0]?.onPress?.();
    viewModel.onOpenFolder({
      id: 'folder-2',
      modifiedTime: '2026-07-10T00:00:00.000Z',
      name: 'Alto Section',
      rootKind: 'my-drive',
      shared: false,
    });

    assert.deepEqual(goToLocationCalls, [0, 0]);
    assert.deepEqual(openedFolderIds, ['folder-2']);
    assert.equal(returnToSearchResultsCallCount, 1);
  });

  it('only counts selectable search results toward the selection toolbar', () => {
    const baseController = {
      discovery: {
        browseSnapshot: {
          folders: [],
          playableSources: [],
          unavailableSources: [],
        },
        canReturnToSearchResults: false,
        currentLocation: ROOT_LOCATION,
        goToLocation: () => undefined,
        isLoading: false,
        navigationStack: [ROOT_LOCATION],
        openFolder: () => undefined,
        playableSources: [],
        returnToSearchResults: () => undefined,
        selectRoot: () => undefined,
        statusCopy: {
          message: 'Browse Google Drive folders and audio.',
          title: 'Drive ready',
          tone: 'neutral',
        },
        unavailableSources: [],
      },
      getDriveSourceActions: () => [],
      getSourceMessage: () => undefined,
      search: {
        activeSearchQuery: 'Warmups',
        canSearch: true,
        clearSearch: () => undefined,
        isLoading: false,
        isSearchMode: true,
        playableSources: [],
        recentSearchTerms: [],
        results: [
          {
            id: 'folder-warmups',
            kind: 'folder',
            name: 'Warmups',
            rootKind: 'my-drive',
            shared: false,
          },
        ],
        searchContextCopy: {
          helper: 'Search Google Drive',
          placeholder: 'Search Google Drive',
        },
        searchQuery: 'Warmups',
        selection: { canSelect: true },
        setSearchQuery: () => undefined,
        statusCopy: {
          message: 'Search Google Drive',
          title: 'Search ready',
          tone: 'neutral',
        },
        submitSearch: () => undefined,
        submitSearchQuery: () => undefined,
        unavailableSources: [],
      },
    } as unknown as ReturnType<typeof useRehearsalLibraryController>;

    const activeQueryViewModel = buildDriveDiscoveryPanelViewModel({
      controller: baseController,
    });

    assert.equal(activeQueryViewModel.selectionResultCount, 1);

    const staleQueryController = {
      ...baseController,
      search: { ...baseController.search, selection: { canSelect: false } },
    } as unknown as ReturnType<typeof useRehearsalLibraryController>;

    const staleQueryViewModel = buildDriveDiscoveryPanelViewModel({
      controller: staleQueryController,
    });

    assert.equal(staleQueryViewModel.selectionResultCount, 0);
  });
});
