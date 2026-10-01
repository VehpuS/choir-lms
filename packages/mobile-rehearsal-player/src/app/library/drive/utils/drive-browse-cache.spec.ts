/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  MY_DRIVE_ROOT_LOCATION,
  type DriveBrowseLocation,
  type DriveBrowseSnapshot,
} from '@org/google-drive';

import {
  createDriveBrowseCache,
  createEmptyDriveBrowseSnapshot,
  getDriveBrowseCacheKey,
  resolveVisibleDriveBrowse,
} from './drive-browse-cache.js';

const createFolderLocation = (id: string): DriveBrowseLocation => ({
  id,
  kind: 'folder',
  name: `Folder ${id}`,
  rootKind: 'my-drive',
});

const createSnapshot = (
  location: DriveBrowseLocation,
  folderIds: string[],
): DriveBrowseSnapshot => ({
  ...createEmptyDriveBrowseSnapshot(location),
  folders: folderIds.map((id) => ({
    id,
    name: id,
    rootKind: location.rootKind,
    shared: false,
  })),
});

describe('resolveVisibleDriveBrowse', () => {
  it('returns the loaded snapshot when it belongs to the current location', () => {
    const loadedSnapshot = createSnapshot(MY_DRIVE_ROOT_LOCATION, ['a']);

    const visible = resolveVisibleDriveBrowse({
      cache: createDriveBrowseCache(),
      currentLocation: MY_DRIVE_ROOT_LOCATION,
      loadedSnapshot,
    });

    assert.equal(visible.snapshot, loadedSnapshot);
    assert.equal(visible.isAwaitingLocation, false);
  });

  it('never shows the previous location rows under a new location', () => {
    const visible = resolveVisibleDriveBrowse({
      cache: createDriveBrowseCache(),
      currentLocation: createFolderLocation('child'),
      loadedSnapshot: createSnapshot(MY_DRIVE_ROOT_LOCATION, ['a', 'b']),
    });

    assert.deepEqual(visible.snapshot.folders, []);
    assert.equal(visible.snapshot.location.id, 'child');
    assert.equal(visible.isAwaitingLocation, true);
  });

  it('returns a cached listing at once, so going back needs no wait', () => {
    const cache = createDriveBrowseCache();
    const cachedSnapshot = createSnapshot(MY_DRIVE_ROOT_LOCATION, ['a']);
    cache.set(getDriveBrowseCacheKey(MY_DRIVE_ROOT_LOCATION), cachedSnapshot);

    const visible = resolveVisibleDriveBrowse({
      cache,
      currentLocation: MY_DRIVE_ROOT_LOCATION,
      loadedSnapshot: createSnapshot(createFolderLocation('child'), ['x']),
    });

    assert.equal(visible.snapshot, cachedSnapshot);
    assert.equal(visible.isAwaitingLocation, false);
  });

  it('keys the cache by root as well as folder id', () => {
    assert.notEqual(
      getDriveBrowseCacheKey({ ...createFolderLocation('same') }),
      getDriveBrowseCacheKey({
        ...createFolderLocation('same'),
        rootKind: 'shared',
      }),
    );
  });
});
