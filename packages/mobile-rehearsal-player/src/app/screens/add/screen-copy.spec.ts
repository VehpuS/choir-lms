import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getAddScreenSummaryCopy } from './screen-copy.js';

describe('getAddScreenSummaryCopy', () => {
  it('shows a search prompt before a query runs', () => {
    assert.deepEqual(
      getAddScreenSummaryCopy({
        activeSearchQuery: null,
        resultCount: 0,
      }),
      {
        body: 'Browse or search My Drive and shared folders, then save promising tracks into Library without leaving this view.',
        title: 'Add from Google Drive',
      },
    );
  });

  it('explains how to recover when a query returns no supported results', () => {
    assert.deepEqual(
      getAddScreenSummaryCopy({
        activeSearchQuery: 'amen cadence',
        resultCount: 0,
      }),
      {
        body: 'No supported rehearsal audio matched "amen cadence" yet. Try a shorter choir, section, or piece name, or clear the search to start over.',
        title: 'No matching rehearsal tracks yet',
      },
    );
  });
});