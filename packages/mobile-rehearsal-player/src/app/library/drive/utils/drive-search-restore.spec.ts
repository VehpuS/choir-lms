import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createSuspendedDriveSearch,
  resolveRestoredSearchToSkip,
} from './drive-search-restore';

describe('createSuspendedDriveSearch', () => {
  it('marks a finished search without an issue as complete', () => {
    assert.deepEqual(
      createSuspendedDriveSearch({
        hasIssue: false,
        isLoading: false,
        query: 'quote',
      }),
      { isComplete: true, query: 'quote' },
    );
  });

  it('does not mark a search that was still loading, or had failed, as complete', () => {
    assert.equal(
      createSuspendedDriveSearch({
        hasIssue: false,
        isLoading: true,
        query: 'quote',
      }).isComplete,
      false,
    );
    assert.equal(
      createSuspendedDriveSearch({
        hasIssue: true,
        isLoading: false,
        query: 'quote',
      }).isComplete,
      false,
    );
  });
});

describe('resolveRestoredSearchToSkip', () => {
  const complete = { isComplete: true, query: 'quote' };

  it('skips re-running a finished search that is being restored', () => {
    assert.equal(resolveRestoredSearchToSkip(complete, 'quote'), 'quote');
  });

  it('runs the search again when it was unfinished, a different query, or nothing was suspended', () => {
    assert.equal(
      resolveRestoredSearchToSkip({ ...complete, isComplete: false }, 'quote'),
      null,
    );
    assert.equal(resolveRestoredSearchToSkip(complete, 'radio'), null);
    assert.equal(resolveRestoredSearchToSkip(null, 'quote'), null);
    assert.equal(resolveRestoredSearchToSkip(complete, null), null);
  });
});
