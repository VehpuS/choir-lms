import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DriveBrowseLocation,
  DriveDiscoveryResult,
} from '@org/google-drive';

import { normalizeDriveImportSelection } from '../../saved-rehearsal-library/drive-import-selection-normalizer';
import {
  attachBrowsePath,
  createDriveBrowseContextKey,
  createDriveBrowseResults,
  getBrowseCoveredRowIds,
  getKeysCoveredByBasketFolders,
  getSelectedFolderIds,
  groupDriveBasket,
} from './drive-basket-model';

const root = (rootKind: 'my-drive' | 'shared'): DriveBrowseLocation => ({
  id: rootKind === 'shared' ? 'shared-root' : 'my-drive-root',
  kind: 'root',
  name: rootKind === 'shared' ? 'Shared folders' : 'My Drive',
  rootKind,
});
const folderLocation = (
  id: string,
  rootKind: 'my-drive' | 'shared' = 'my-drive',
): DriveBrowseLocation => ({ id, kind: 'folder', name: id, rootKind });

const folder = (
  id: string,
  overrides: Partial<DriveDiscoveryResult> = {},
): DriveDiscoveryResult =>
  ({
    id,
    kind: 'folder',
    name: id,
    rootKind: 'my-drive',
    shared: false,
    ...overrides,
  }) as DriveDiscoveryResult;

const audio = (
  id: string,
  overrides: Partial<DriveDiscoveryResult> = {},
): DriveDiscoveryResult =>
  ({
    driveFileId: id,
    id,
    kind: 'audio',
    name: `${id}.mp3`,
    rootKind: 'my-drive',
    ...overrides,
  }) as unknown as DriveDiscoveryResult;

describe('drive basket model', () => {
  it('gives browse rows the folder path of the stack they were picked in', () => {
    const stack = [root('my-drive'), folderLocation('Advent')];
    const result = attachBrowsePath(audio('a'), stack);

    assert.deepEqual(result.path, [{ id: 'Advent', name: 'Advent' }]);
    assert.equal(result.rootKind, 'my-drive');
  });

  it('keeps the path a search result already carries', () => {
    const withPath = audio('a', { path: [{ id: 'x', name: 'X' }] });

    assert.equal(attachBrowsePath(withPath, [root('shared')]), withPath);
  });

  it('builds browse results with a kind and path for every row', () => {
    const results = createDriveBrowseResults(
      {
        folders: [folder('f1')] as never,
        playableSources: [audio('p1')] as never,
        unavailableSources: [audio('u1')] as never,
      },
      [root('shared')],
    );

    assert.deepEqual(
      results.map(({ id, kind, path, rootKind }) => ({
        id,
        kind,
        path,
        rootKind,
      })),
      [
        { id: 'f1', kind: 'folder', path: [], rootKind: 'shared' },
        { id: 'p1', kind: 'audio', path: [], rootKind: 'shared' },
        { id: 'u1', kind: 'audio', path: [], rootKind: 'shared' },
      ],
    );
  });

  it('keys a browse context by root and folder', () => {
    assert.notEqual(
      createDriveBrowseContextKey(root('my-drive')),
      createDriveBrowseContextKey(root('shared')),
    );
  });

  it('marks every row of a folder opened inside a selected folder as covered', () => {
    const selectedFolderIds = getSelectedFolderIds([folder('Advent')]);
    const stack = [root('my-drive'), folderLocation('Advent')];

    assert.deepEqual(
      [
        ...getBrowseCoveredRowIds({
          navigationStack: stack,
          rowIds: ['a', 'b'],
          selectedFolderIds,
        }),
      ],
      ['a', 'b'],
    );
    assert.equal(
      getBrowseCoveredRowIds({
        navigationStack: [root('my-drive')],
        rowIds: ['a'],
        selectedFolderIds,
      }).size,
      0,
    );
  });

  it('finds the selected items that sit inside a selected folder', () => {
    const covered = getKeysCoveredByBasketFolders([
      folder('Advent'),
      folder('Carols', { path: [{ id: 'Advent', name: 'Advent' }] }),
      audio('in-advent', { path: [{ id: 'Advent', name: 'Advent' }] }),
      audio('elsewhere', { path: [{ id: 'Other', name: 'Other' }] }),
    ]);

    assert.deepEqual(covered, ['Carols', 'in-advent']);
  });

  it('groups the basket by root then path, my drive first', () => {
    const groups = groupDriveBasket([
      audio('s1', { path: [{ id: 'sf', name: 'Choir' }], rootKind: 'shared' }),
      audio('m2', { path: [{ id: 'b', name: 'B' }] }),
      audio('m1', { path: [{ id: 'a', name: 'A' }] }),
    ]);

    assert.deepEqual(
      groups.map((group) => [
        group.label,
        group.entries.map((entry) => entry.pathLabel),
      ]),
      [
        ['My Drive', ['My Drive / A', 'My Drive / B']],
        ['Shared folders', ['Shared folders / Choir']],
      ],
    );
  });

  it('plans a basket across both roots, collapsing overlaps', () => {
    const advent = folder('Advent', { path: [] });
    const nested = folder('Carols', {
      path: [{ id: 'Advent', name: 'Advent' }],
    });
    const covered = audio('in-advent', {
      path: [{ id: 'Advent', name: 'Advent' }],
    });
    const shared = audio('shared-song', { rootKind: 'shared', path: [] });
    const normalized = normalizeDriveImportSelection([
      advent,
      nested,
      covered,
      shared,
      shared,
    ]);

    assert.deepEqual(
      normalized.folders.map(({ id }) => id),
      ['Advent'],
    );
    assert.deepEqual(
      normalized.audio.map(({ id }) => id),
      ['shared-song'],
    );
    assert.deepEqual(normalized.overlapCounts, {
      coveredAudio: 1,
      duplicateSelections: 1,
      nestedFolders: 1,
      total: 3,
    });
  });
});
