/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveBrowseLocation } from '@org/google-drive';

import type {
  DriveLibraryFolder,
  DriveLibrarySource,
} from '../utils/drive-library-view-model';

import { buildDriveDiscoveryExplorerState } from './drive-discovery-panel-model.js';

const ROOT_LOCATION: DriveBrowseLocation = {
  id: 'root:my-drive',
  kind: 'root',
  name: 'My Drive',
  rootKind: 'my-drive',
};

const FOLDER_LOCATION: DriveBrowseLocation = {
  id: 'folder-1',
  kind: 'folder',
  name: 'Warmups',
  rootKind: 'my-drive',
};

const CHILD_FOLDER = {
  id: 'folder-2',
  modifiedTime: '2026-07-10T00:00:00.000Z',
  name: 'Alto Entrances',
  rootKind: 'my-drive',
  shared: false,
} as DriveLibraryFolder;

const PLAYABLE_SOURCE = {
  availability: {
    status: 'available',
  },
  durationMs: 181000,
  extension: 'mp3',
  id: 'source-1',
  locationLabel: 'Warmups',
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-10T00:00:00.000Z',
  name: 'Tenor Warmup.mp3',
} as DriveLibrarySource;

const UNAVAILABLE_SOURCE = {
  availability: {
    message: 'Reconnect Drive to preview this track.',
    reason: 'access-revoked',
    status: 'unavailable',
  },
  extension: 'mp3',
  id: 'source-2',
  locationLabel: 'Warmups',
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-10T00:00:00.000Z',
  name: 'Bass Notes.mp3',
} as DriveLibrarySource;

const SEARCH_RESULT = {
  availability: {
    status: 'available',
  },
  durationMs: 92000,
  extension: 'wav',
  id: 'source-3',
  locationLabel: 'Warmups / Alto Entrances',
  mimeType: 'audio/wav',
  modifiedTime: '2026-07-10T00:00:00.000Z',
  name: 'Entrance Cue.wav',
} as DriveLibrarySource;

describe('drive discovery panel model', () => {
  it('keeps root explorer chrome and disables back navigation at root', () => {
    const explorer = buildDriveDiscoveryExplorerState({
      browseFolders: [CHILD_FOLDER],
      browsePlayableSources: [PLAYABLE_SOURCE],
      browseUnavailableSources: [],
      currentLocation: ROOT_LOCATION,
      isSearchMode: false,
      navigationStack: [ROOT_LOCATION],
      searchPlayableSources: [],
      searchUnavailableSources: [],
    });

    assert.equal(explorer.canGoBack, false);
    assert.equal(explorer.currentTitle, 'My Drive');
    assert.deepEqual(explorer.breadcrumbs, [
      {
        isCurrent: true,
        key: 'root:root:my-drive',
        label: 'My Drive',
        locationIndex: 0,
      },
    ]);
    assert.deepEqual(
      explorer.rows.map((row) => {
        return row.kind === 'folder' ? row.folder.name : row.source.name;
      }),
      ['Alto Entrances', 'Tenor Warmup.mp3'],
    );
  });

  it('builds one browse list with folders first and current-path breadcrumbs', () => {
    const explorer = buildDriveDiscoveryExplorerState({
      browseFolders: [CHILD_FOLDER],
      browsePlayableSources: [PLAYABLE_SOURCE],
      browseUnavailableSources: [UNAVAILABLE_SOURCE],
      currentLocation: FOLDER_LOCATION,
      isSearchMode: false,
      navigationStack: [ROOT_LOCATION, FOLDER_LOCATION],
      searchPlayableSources: [],
      searchUnavailableSources: [],
    });

    assert.equal(explorer.canGoBack, true);
    assert.equal(explorer.currentTitle, 'Warmups');
    assert.deepEqual(explorer.breadcrumbs, [
      {
        isCurrent: false,
        key: 'root:root:my-drive',
        label: 'My Drive',
        locationIndex: 0,
      },
      {
        isCurrent: true,
        key: 'folder:folder-1',
        label: 'Warmups',
        locationIndex: 1,
      },
    ]);
    assert.deepEqual(
      explorer.rows.map((row) => {
        return row.kind === 'folder' ? row.folder.name : row.source.name;
      }),
      ['Alto Entrances', 'Tenor Warmup.mp3', 'Bass Notes.mp3'],
    );
  });

  it('keeps current-location chrome while switching the list body to search results', () => {
    const explorer = buildDriveDiscoveryExplorerState({
      browseFolders: [CHILD_FOLDER],
      browsePlayableSources: [PLAYABLE_SOURCE],
      browseUnavailableSources: [UNAVAILABLE_SOURCE],
      currentLocation: FOLDER_LOCATION,
      isSearchMode: true,
      navigationStack: [ROOT_LOCATION, FOLDER_LOCATION],
      searchPlayableSources: [SEARCH_RESULT],
      searchUnavailableSources: [UNAVAILABLE_SOURCE],
    });

    assert.equal(explorer.canGoBack, true);
    assert.equal(explorer.currentTitle, 'Warmups');
    assert.deepEqual(
      explorer.breadcrumbs.map((breadcrumb) => {
        return breadcrumb.label;
      }),
      ['My Drive', 'Warmups'],
    );
    assert.deepEqual(
      explorer.rows.map((row) => {
        return row.kind;
      }),
      ['source', 'source'],
    );
    assert.deepEqual(
      explorer.rows.map((row) => {
        return row.kind === 'folder' ? row.folder.name : row.source.name;
      }),
      ['Entrance Cue.wav', 'Bass Notes.mp3'],
    );
  });
});
