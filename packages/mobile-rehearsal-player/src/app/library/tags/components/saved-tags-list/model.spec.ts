import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterSavedTagUsageByQuery,
  getSavedTagsListSortDirectionToggleLabel,
  getSavedTagUsageMetadataLabel,
  sortSavedTagUsage,
} from './model';

describe('getSavedTagUsageMetadataLabel', () => {
  it('uses the singular noun for a single-entity tag', () => {
    assert.equal(
      getSavedTagUsageMetadataLabel({ count: 1, tag: 'Soprano' }),
      '1 item',
    );
  });

  it('uses the plural noun for a multi-entity tag', () => {
    assert.equal(
      getSavedTagUsageMetadataLabel({ count: 4, tag: 'Warmup' }),
      '4 items',
    );
  });
});

describe('sortSavedTagUsage', () => {
  const tagUsage = [
    { count: 2, tag: 'Alto' },
    { count: 5, tag: 'Bass' },
    { count: 2, tag: 'zebra' },
  ];

  it('sorts by count descending with an alphabetical tie-break, matching the default aggregation order', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'desc', field: 'count' }),
      [
        { count: 5, tag: 'Bass' },
        { count: 2, tag: 'Alto' },
        { count: 2, tag: 'zebra' },
      ],
    );
  });

  it('sorts by count ascending while keeping the tie-break alphabetical, not reversed', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'asc', field: 'count' }),
      [
        { count: 2, tag: 'Alto' },
        { count: 2, tag: 'zebra' },
        { count: 5, tag: 'Bass' },
      ],
    );
  });

  it('sorts by name ascending case-insensitively', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'asc', field: 'name' }),
      [
        { count: 2, tag: 'Alto' },
        { count: 5, tag: 'Bass' },
        { count: 2, tag: 'zebra' },
      ],
    );
  });

  it('sorts by name descending case-insensitively', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'desc', field: 'name' }),
      [
        { count: 2, tag: 'zebra' },
        { count: 5, tag: 'Bass' },
        { count: 2, tag: 'Alto' },
      ],
    );
  });

  it('does not mutate the input array', () => {
    const original = [...tagUsage];

    sortSavedTagUsage(tagUsage, { direction: 'asc', field: 'name' });

    assert.deepEqual(tagUsage, original);
  });
});

describe('getSavedTagsListSortDirectionToggleLabel', () => {
  it('offers to switch to descending order while ascending', () => {
    assert.equal(getSavedTagsListSortDirectionToggleLabel('asc'), 'Sort descending');
  });

  it('offers to switch to ascending order while descending', () => {
    assert.equal(getSavedTagsListSortDirectionToggleLabel('desc'), 'Sort ascending');
  });
});

describe('filterSavedTagUsageByQuery', () => {
  const tagUsage = [
    { count: 2, tag: 'Soprano' },
    { count: 5, tag: 'Bass' },
    { count: 1, tag: 'sop2' },
  ];

  it('returns every tag when the query is empty or whitespace-only', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, ''), tagUsage);
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, '   '), tagUsage);
  });

  it('matches tag names case-insensitively by substring', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, 'SOP'), [
      { count: 2, tag: 'Soprano' },
      { count: 1, tag: 'sop2' },
    ]);
  });

  it('trims surrounding whitespace from the query', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, '  bass  '), [
      { count: 5, tag: 'Bass' },
    ]);
  });

  it('returns an empty array when nothing matches', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, 'alto'), []);
  });
});
