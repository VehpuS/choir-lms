import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getDriveImportReviewDestinationCopy,
  getDriveImportReviewHeaderCopy,
  getDriveImportReviewModeCopy,
  getDriveImportReviewSummaryStatusCopy,
} from './screen-copy.js';

describe('getDriveImportReviewHeaderCopy', () => {
  it('describes the review flow', () => {
    assert.deepEqual(getDriveImportReviewHeaderCopy(), {
      helper: 'Choose where these Drive folders and tracks go in Library.',
      title: 'Review import',
    });
  });
});

describe('getDriveImportReviewDestinationCopy', () => {
  it('provides a title and an empty-library helper', () => {
    assert.deepEqual(getDriveImportReviewDestinationCopy(), {
      emptyHelper:
        'Create a Library folder first to choose an import destination.',
      title: 'Library destination',
    });
  });
});

describe('getDriveImportReviewModeCopy', () => {
  it('labels both import modes', () => {
    assert.deepEqual(getDriveImportReviewModeCopy(), {
      flattenLabel: 'Flatten',
      preserveStructureLabel: 'Preserve structure',
      title: 'Folder structure',
    });
  });
});

describe('getDriveImportReviewSummaryStatusCopy', () => {
  it('prompts for a destination while idle', () => {
    assert.equal(
      getDriveImportReviewSummaryStatusCopy('idle'),
      'Choose a Library destination to see the import summary.',
    );
  });

  it('reports a failure when the review could not be prepared', () => {
    assert.equal(
      getDriveImportReviewSummaryStatusCopy('error'),
      'The import review could not be prepared.',
    );
  });
});
