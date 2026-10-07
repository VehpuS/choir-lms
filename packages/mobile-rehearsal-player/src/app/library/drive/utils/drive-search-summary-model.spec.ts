/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDriveSearchSummary } from './drive-search-summary-model.js';

const base = {
  hasIssue: false,
  isLoading: false,
  isSearchActive: true,
  resultFolderCount: 0,
  resultTrackCount: 0,
  unavailableCount: 0,
};

describe('Drive search summary', () => {
  it('has no summary outside an active search', () => {
    assert.equal(
      getDriveSearchSummary({ ...base, isSearchActive: false }),
      null,
    );
  });

  it('reads Searching before any result arrives, in the same slot', () => {
    assert.deepEqual(getDriveSearchSummary({ ...base, isLoading: true }), {
      isRunning: true,
      label: 'Searching…',
      stoppedEarly: false,
    });
  });

  it('leaves empty and failed-with-nothing searches to their own card', () => {
    assert.equal(getDriveSearchSummary(base), null);
    assert.equal(getDriveSearchSummary({ ...base, hasIssue: true }), null);
  });

  it('keeps the same label while running and after finishing', () => {
    const counts = { ...base, resultFolderCount: 36, resultTrackCount: 12 };
    const running = getDriveSearchSummary({ ...counts, isLoading: true });
    const finished = getDriveSearchSummary(counts);

    assert.equal(running?.label, '36 folders · 12 tracks');
    assert.equal(finished?.label, running?.label);
    assert.equal(running?.isRunning, true);
    assert.equal(finished?.isRunning, false);
  });

  it('uses singular nouns and omits a kind with no results', () => {
    assert.equal(
      getDriveSearchSummary({ ...base, resultFolderCount: 1 })?.label,
      '1 folder',
    );
    assert.equal(
      getDriveSearchSummary({ ...base, resultTrackCount: 1 })?.label,
      '1 track',
    );
  });

  it('adds unavailable matches as a third part', () => {
    assert.equal(
      getDriveSearchSummary({
        ...base,
        resultFolderCount: 2,
        resultTrackCount: 3,
        unavailableCount: 4,
      })?.label,
      '2 folders · 3 tracks · 4 unavailable',
    );
  });

  it('flags a search that failed after producing results, but not one still running', () => {
    const counts = { ...base, hasIssue: true, resultTrackCount: 5 };

    assert.equal(getDriveSearchSummary(counts)?.stoppedEarly, true);
    assert.equal(
      getDriveSearchSummary({ ...counts, isLoading: true })?.stoppedEarly,
      false,
    );
  });
});
