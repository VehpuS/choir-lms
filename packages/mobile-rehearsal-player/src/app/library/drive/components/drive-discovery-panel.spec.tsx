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
        searchContextCopy: {
          helper: 'Search Google Drive',
          placeholder: 'Search Google Drive',
        },
        searchQuery: '',
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
  });
});
