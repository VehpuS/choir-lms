import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveImportCompletionSummary } from '../../library/saved-rehearsal-library/drive-import-status';
import {
  buildDriveImportCompletionSummaryRows,
  canRetryDriveImportCompletion,
  getDriveImportCompletionStatusCopy,
  getDriveImportProgressCopy,
  resolveDriveImportReviewHeaderMode,
} from './drive-import-progress-model.js';

describe('resolveDriveImportReviewHeaderMode', () => {
  it('maps executing and completed statuses to their own header mode', () => {
    assert.equal(resolveDriveImportReviewHeaderMode('executing'), 'executing');
    assert.equal(resolveDriveImportReviewHeaderMode('completed'), 'completed');
  });

  it('falls back to the default header mode for every other status', () => {
    assert.equal(resolveDriveImportReviewHeaderMode('idle'), 'default');
    assert.equal(resolveDriveImportReviewHeaderMode('preparing'), 'default');
    assert.equal(resolveDriveImportReviewHeaderMode('review'), 'default');
    assert.equal(resolveDriveImportReviewHeaderMode('error'), 'default');
  });
});

describe('getDriveImportProgressCopy', () => {
  it('labels the preparing phase without a known total', () => {
    assert.deepEqual(
      getDriveImportProgressCopy({ completedItems: 2, phase: 'preparing' }),
      {
        completedItems: 2,
        phaseLabel: 'Preparing Drive contents',
        totalItems: null,
      },
    );
  });

  it('labels each execution phase with its known total', () => {
    assert.deepEqual(
      getDriveImportProgressCopy({
        completedItems: 1,
        phase: 'creating-folders',
        totalItems: 4,
      }),
      { completedItems: 1, phaseLabel: 'Creating folders', totalItems: 4 },
    );
    assert.deepEqual(
      getDriveImportProgressCopy({
        completedItems: 2,
        phase: 'saving-sources',
        totalItems: 5,
      }),
      { completedItems: 2, phaseLabel: 'Saving tracks', totalItems: 5 },
    );
    assert.deepEqual(
      getDriveImportProgressCopy({
        completedItems: 3,
        phase: 'linking-tracks',
        totalItems: 5,
      }),
      { completedItems: 3, phaseLabel: 'Linking tracks', totalItems: 5 },
    );
  });
});

describe('getDriveImportCompletionStatusCopy', () => {
  it('describes every completion status distinctly', () => {
    const statuses: DriveImportCompletionSummary['status'][] = [
      'completed',
      'cancelled',
      'partial-failure',
      'failed',
    ];

    const copies = statuses.map(getDriveImportCompletionStatusCopy);

    assert.equal(new Set(copies.map((copy) => copy.title)).size, 4);
    for (const copy of copies) {
      assert.ok(copy.description.length > 0);
    }
  });
});

describe('canRetryDriveImportCompletion', () => {
  const buildSummary = (
    status: DriveImportCompletionSummary['status'],
  ): DriveImportCompletionSummary => ({
    counts: {
      'already-present': 0,
      cancelled: 0,
      created: 0,
      failed: 0,
      'overlap-collapsed': 0,
      reused: 0,
      unsupported: 0,
    },
    status,
    totalItems: 0,
  });

  it('does not offer retry once every item completed successfully', () => {
    assert.equal(
      canRetryDriveImportCompletion(buildSummary('completed')),
      false,
    );
  });

  it('offers retry for cancelled, failed, and partial-failure outcomes', () => {
    assert.equal(
      canRetryDriveImportCompletion(buildSummary('cancelled')),
      true,
    );
    assert.equal(canRetryDriveImportCompletion(buildSummary('failed')), true);
    assert.equal(
      canRetryDriveImportCompletion(buildSummary('partial-failure')),
      true,
    );
  });
});

describe('buildDriveImportCompletionSummaryRows', () => {
  it('maps every itemized outcome count to a labeled row in a fixed order', () => {
    const summary: DriveImportCompletionSummary = {
      counts: {
        'already-present': 2,
        cancelled: 3,
        created: 1,
        failed: 7,
        'overlap-collapsed': 5,
        reused: 4,
        unsupported: 6,
      },
      status: 'partial-failure',
      totalItems: 28,
    };

    assert.deepEqual(buildDriveImportCompletionSummaryRows(summary), [
      { key: 'created', label: 'Created', value: 1 },
      { key: 'reused', label: 'Reused', value: 4 },
      { key: 'already-present', label: 'Already in destination', value: 2 },
      { key: 'unsupported', label: 'Unsupported files skipped', value: 6 },
      {
        key: 'overlap-collapsed',
        label: 'Overlapping selections collapsed',
        value: 5,
      },
      { key: 'cancelled', label: 'Cancelled', value: 3 },
      { key: 'failed', label: 'Failed', value: 7 },
    ]);
  });
});
