import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveImportPlan } from './drive-import-planner.js';
import {
  createDriveImportCompletionSummary,
  createDriveImportReviewSummary,
  type DriveImportOutcome,
  type DriveImportProgress,
} from './drive-import-status.js';

const createPlan = (): DriveImportPlan => ({
  destinationFolderId: 'destination',
  folders: [],
  mode: 'preserve-structure',
  summary: {
    alreadyPresentTracks: 1,
    foldersToCreate: 2,
    newTracks: 3,
    reusableTracks: 4,
    tracksToImport: 8,
    unsupportedFiles: 5,
  },
  tracks: [],
  unsupportedSources: [],
});

describe('Drive import status aggregation', () => {
  it('summarizes a review from its classified plan and collapsed overlaps', () => {
    const summary = createDriveImportReviewSummary(createPlan(), {
      coveredAudio: 2,
      duplicateSelections: 3,
      nestedFolders: 1,
      total: 6,
    });

    assert.deepEqual(summary, {
      alreadyPresentTracks: 1,
      collapsedOverlaps: 6,
      foldersToCreate: 2,
      newTracks: 3,
      reusableTracks: 4,
      tracksToImport: 8,
      unsupportedFiles: 5,
    });
  });

  it('supports preparing progress without a known total and counted execution', () => {
    const progress: DriveImportProgress[] = [
      { completedItems: 4, phase: 'preparing' },
      {
        completedItems: 2,
        phase: 'creating-folders',
        totalItems: 5,
      },
      { completedItems: 1, phase: 'saving-sources', totalItems: 3 },
      { completedItems: 1, phase: 'linking-tracks', totalItems: 3 },
    ];

    assert.deepEqual(
      progress.map(({ phase }) => phase),
      ['preparing', 'creating-folders', 'saving-sources', 'linking-tracks'],
    );
    assert.equal(progress[0]?.totalItems, undefined);
  });

  it('counts every itemized completion outcome', () => {
    const outcomes: DriveImportOutcome[] = [
      {
        itemId: 'folder-1',
        itemKind: 'folder',
        itemName: 'Choir',
        status: 'created',
      },
      {
        itemId: 'source-1',
        itemKind: 'source',
        itemName: 'One',
        status: 'reused',
      },
      {
        itemId: 'link-1',
        itemKind: 'link',
        itemName: 'One',
        status: 'already-present',
      },
      {
        itemId: 'source-2',
        itemKind: 'source',
        itemName: 'Two',
        status: 'unsupported',
      },
      {
        itemId: 'selection-1',
        itemKind: 'selection',
        itemName: 'Two',
        status: 'overlap-collapsed',
      },
      {
        itemId: 'link-2',
        itemKind: 'link',
        itemName: 'Three',
        status: 'cancelled',
      },
      {
        errorMessage: 'Drive item became unavailable.',
        itemId: 'source-3',
        itemKind: 'source',
        itemName: 'Four',
        status: 'failed',
      },
    ];

    assert.deepEqual(createDriveImportCompletionSummary(outcomes), {
      counts: {
        'already-present': 1,
        cancelled: 1,
        created: 1,
        failed: 1,
        'overlap-collapsed': 1,
        reused: 1,
        unsupported: 1,
      },
      status: 'cancelled',
      totalItems: 7,
    });
  });

  it('distinguishes successful, failed, and partial-failure completion', () => {
    const created: DriveImportOutcome = {
      itemId: 'link-1',
      itemKind: 'link',
      itemName: 'Song',
      status: 'created',
    };
    const failed: DriveImportOutcome = {
      errorMessage: 'Write failed.',
      itemId: 'link-2',
      itemKind: 'link',
      itemName: 'Other Song',
      status: 'failed',
    };

    assert.equal(
      createDriveImportCompletionSummary([created]).status,
      'completed',
    );
    assert.equal(createDriveImportCompletionSummary([failed]).status, 'failed');
    assert.equal(
      createDriveImportCompletionSummary([created, failed]).status,
      'partial-failure',
    );
  });
});
