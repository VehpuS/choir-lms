/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveDiscoveryResult } from '@org/google-drive';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  createDriveBrowseFolderRows,
  createDriveBrowseSourceRows,
  createDriveSearchResultRows,
  getDriveExplorerRowSelectionState,
  getDriveRowSelectionGlyph,
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

const SEARCH_NOW = new Date('2026-09-29T12:00:00.000Z');

describe('Drive explorer row model', () => {
  it('maps mixed search results to identified, highlighted rows that lead with their path', () => {
    const rows = createDriveSearchResultRows({
      now: SEARCH_NOW,
      query: 'warm',
      results: SEARCH_RESULTS,
    });

    assert.equal(rows[0]?.kind, 'folder');
    assert.equal(rows[0]?.highlightQuery, 'warm');
    assert.deepEqual(rows[0]?.metadataLabels, [
      'Folder',
      'Shared with you / Choir / Autumn',
      'Updated 12 Sep',
      'Shared folder',
    ]);
    assert.equal(rows[1]?.kind, 'source');
    assert.equal(rows[1]?.highlightQuery, 'warm');
    assert.deepEqual(rows[1]?.metadataLabels, [
      'Audio',
      'My Drive / Choir / Autumn / Warmups',
      'WAV',
      '1:32',
    ]);
  });

  it('names an unplayable search result reason before its path', () => {
    const audioResult = SEARCH_RESULTS[1];
    assert.equal(audioResult?.kind, 'audio');
    if (!audioResult || audioResult.kind !== 'audio') {
      return;
    }

    const [row] = createDriveSearchResultRows({
      now: SEARCH_NOW,
      query: 'warm',
      results: [
        {
          ...audioResult,
          availability: {
            reason: 'unsupported-format',
            status: 'unsupported',
          },
        },
      ],
    });

    assert.deepEqual(row?.metadataLabels, [
      'Audio',
      'Not a supported audio format',
      'My Drive / Choir / Autumn / Warmups',
    ]);
  });

  it('keeps ordinary browse folder rows free of search-only presentation (no kind word or path)', () => {
    const folderResult = SEARCH_RESULTS[0];
    assert.equal(folderResult?.kind, 'folder');
    if (!folderResult || folderResult.kind !== 'folder') {
      return;
    }

    const [row] = createDriveBrowseFolderRows(
      [folderResult],
      new Date('2026-09-29T12:00:00.000Z'),
    );

    assert.equal(row?.highlightQuery, null);
    assert.deepEqual(row?.metadataLabels, ['Updated 12 Sep', 'Shared folder']);
  });

  it('gives browse audio rows the format, size, and duration meta of screen 1e', () => {
    const [row] = createDriveBrowseSourceRows([
      {
        ...PLAYABLE_SOURCE,
        locationLabel: 'My Drive',
        sizeBytes: 3 * 1024 * 1024,
      },
    ]);

    assert.deepEqual(row?.metadataLabels, ['MP3', '3 MB', '3:05']);
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

  it('gives selected rows a filled accent check and unselected rows an empty circle', () => {
    const selected = getDriveRowSelectionGlyph(true);
    const unselected = getDriveRowSelectionGlyph(false);

    assert.equal(selected.name, 'check-circle');
    assert.equal(unselected.name, 'circle-outline');
    // The glyph shape differs, so the state never rests on color alone.
    assert.notEqual(selected.name, unselected.name);
    assert.notEqual(selected.color, unselected.color);
  });
});
