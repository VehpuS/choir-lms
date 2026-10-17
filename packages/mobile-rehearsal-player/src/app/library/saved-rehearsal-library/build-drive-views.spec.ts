import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDriveDiscoveryView,
  buildDriveSearchView,
} from './build-drive-views';

type DriveLibraryArgument = Parameters<
  typeof buildDriveDiscoveryView
>[0]['driveLibrary'];

// A lightweight fake: the builders only read these fields, so the full hook
// result is not needed to observe their output.
const createDriveLibrary = (
  overrides: Record<string, unknown> = {},
): DriveLibraryArgument => {
  return {
    activeSearchQuery: null,
    browseSnapshot: {
      folders: [{}, {}],
      playableSources: [{}],
      unavailableSources: [],
    },
    currentLocation: { kind: 'folder', name: 'Choir', rootKind: 'my-drive' },
    isLoading: true,
    searchResults: [{}, {}, {}],
    searchSnapshot: { playableSources: [{}, {}], unavailableSources: [{}] },
    ...overrides,
  } as unknown as DriveLibraryArgument;
};

// The status copy is passed through untouched, so its content is irrelevant.
const baseOptions = { canRefresh: true, statusCopy: null as never };

test('discovery titles count folders, audio, and unavailable files', () => {
  const view = buildDriveDiscoveryView({
    ...baseOptions,
    driveLibrary: createDriveLibrary(),
    isSearchMode: false,
  });

  assert.equal(view.folderTitle, 'Folders (2)');
  assert.equal(view.playableSourceTitle, 'Audio in Choir (1)');
  assert.equal(
    view.unavailableSourceTitle,
    'Unavailable or unsupported in Choir (0)',
  );
});

test('discovery titles the shared root as shared folders', () => {
  const view = buildDriveDiscoveryView({
    ...baseOptions,
    driveLibrary: createDriveLibrary({
      currentLocation: { kind: 'root', name: 'Shared', rootKind: 'shared' },
    }),
    isSearchMode: false,
  });

  assert.equal(view.folderTitle, 'Shared folders (2)');
});

test('loading belongs to discovery or search, never both', () => {
  const driveLibrary = createDriveLibrary();
  const browsing = {
    discovery: buildDriveDiscoveryView({
      ...baseOptions,
      driveLibrary,
      isSearchMode: false,
    }),
    search: buildDriveSearchView({
      ...baseOptions,
      driveLibrary,
      isSearchMode: false,
    }),
  };
  const searching = {
    discovery: buildDriveDiscoveryView({
      ...baseOptions,
      driveLibrary,
      isSearchMode: true,
    }),
    search: buildDriveSearchView({
      ...baseOptions,
      driveLibrary,
      isSearchMode: true,
    }),
  };

  assert.deepEqual(
    [browsing.discovery.isLoading, browsing.search.isLoading],
    [true, false],
  );
  assert.deepEqual(
    [searching.discovery.isLoading, searching.search.isLoading],
    [false, true],
  );
});

test('search view counts matches and unavailable results', () => {
  const view = buildDriveSearchView({
    ...baseOptions,
    driveLibrary: createDriveLibrary(),
    isSearchMode: true,
  });

  assert.equal(view.playableSourceTitle, 'Matching audio (2)');
  assert.equal(
    view.unavailableSourceTitle,
    'Unavailable or unsupported results (1)',
  );
  assert.equal(view.totalResultCount, 3);
  assert.equal(view.canSearch, true);
});
