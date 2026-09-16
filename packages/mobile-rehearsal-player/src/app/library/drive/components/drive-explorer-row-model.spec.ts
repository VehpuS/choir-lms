/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveDiscoveryResult } from '@org/google-drive';

import {
  createDriveBrowseFolderRows,
  createDriveSearchResultRows,
  getDriveExplorerRowSelectionState,
  resolveDriveDiscoveryResultFromRow,
} from './drive-explorer-row-model.js';

const SEARCH_RESULTS: DriveDiscoveryResult[] = [
  {
    id: 'folder-1',
    kind: 'folder',
    locationLabel: 'Shared with you / Choir / Autumn',
    modifiedTime: '2026-09-12T00:00:00.000Z',
    name: 'Warmups',
    path: [
      { id: 'choir', name: 'Choir' },
      { id: 'autumn', name: 'Autumn' },
      { id: 'folder-1', name: 'Warmups' },
    ],
    rootKind: 'shared',
    shared: true,
  },
  {
    availability: { status: 'available' },
    createdAt: '2026-09-13T00:00:00.000Z',
    driveFileId: 'audio-1',
    durationMs: 92000,
    extension: 'wav',
    id: 'audio-1',
    kind: 'audio',
    locationLabel: 'My Drive / Choir / Autumn / Warmups',
    mimeType: 'audio/wav',
    modifiedTime: '2026-09-13T00:00:00.000Z',
    name: 'Warmup Canon.wav',
    path: [
      { id: 'choir', name: 'Choir' },
      { id: 'autumn', name: 'Autumn' },
      { id: 'warmups', name: 'Warmups' },
    ],
    provider: 'google-drive',
    rootKind: 'my-drive',
  },
];

describe('Drive explorer row model', () => {
  it('maps mixed search results to identified, highlighted, path-aware rows', () => {
    const rows = createDriveSearchResultRows({
      query: 'warm',
      results: SEARCH_RESULTS,
    });

    assert.equal(rows[0]?.kind, 'folder');
    assert.equal(rows[0]?.highlightQuery, 'warm');
    assert.deepEqual(rows[0]?.metadataLabels, [
      'Folder',
      'Shared folder',
      'Updated 2026-09-12',
      'Shared with you / Choir / Autumn',
    ]);
    assert.equal(rows[1]?.kind, 'source');
    assert.equal(rows[1]?.highlightQuery, 'warm');
    assert.deepEqual(rows[1]?.metadataLabels, [
      'Audio',
      '1:32',
      'Updated 2026-09-13',
      'My Drive / Choir / Autumn / Warmups',
    ]);
  });

  it('keeps ordinary browse folder rows free of search-only presentation', () => {
    const folderResult = SEARCH_RESULTS[0];
    assert.equal(folderResult?.kind, 'folder');
    if (!folderResult || folderResult.kind !== 'folder') {
      return;
    }

    const [row] = createDriveBrowseFolderRows([folderResult]);

    assert.equal(row?.highlightQuery, null);
    assert.deepEqual(row?.metadataLabels, ['Shared folder']);
  });

  it('round-trips search rows back into their originating discovery results for selection', () => {
    const [folderRow, sourceRow] = createDriveSearchResultRows({
      query: 'warm',
      results: SEARCH_RESULTS,
    });

    assert.ok(folderRow);
    assert.ok(sourceRow);
    assert.deepEqual(
      resolveDriveDiscoveryResultFromRow(folderRow),
      SEARCH_RESULTS[0],
    );
    assert.deepEqual(
      resolveDriveDiscoveryResultFromRow(sourceRow),
      SEARCH_RESULTS[1],
    );
  });

  it('only reports row selection state while selection mode is active', () => {
    const [folderRow, sourceRow] = createDriveSearchResultRows({
      query: 'warm',
      results: SEARCH_RESULTS,
    });

    assert.ok(folderRow);
    assert.ok(sourceRow);
    assert.equal(
      getDriveExplorerRowSelectionState({
        isSelectionMode: false,
        row: folderRow,
        selectedResultIds: new Set([folderRow.key]),
      }),
      undefined,
    );
    assert.equal(
      getDriveExplorerRowSelectionState({
        isSelectionMode: true,
        row: folderRow,
        selectedResultIds: new Set([folderRow.key]),
      }),
      true,
    );
    assert.equal(
      getDriveExplorerRowSelectionState({
        isSelectionMode: true,
        row: sourceRow,
        selectedResultIds: new Set([folderRow.key]),
      }),
      false,
    );
    assert.equal(
      getDriveExplorerRowSelectionState({
        isSelectionMode: true,
        row: sourceRow,
        selectedResultIds: undefined,
      }),
      false,
    );
  });
});
