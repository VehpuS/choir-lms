import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  filterSavedTagUsageByQuery,
  getSavedTagsListSortDirectionToggleLabel,
  getSavedTagUsageAddedDateLabel,
  getSavedTagUsageMetadataLabel,
  getSavedTagUsageRowMetadataLabel,
  sortSavedTagUsage,
} from './model';

describe('getSavedTagUsageMetadataLabel', () => {
  it('uses the singular noun for a single-entity tag', () => {
    assert.equal(
      getSavedTagUsageMetadataLabel({ count: 1, tag: 'Soprano', createdAt: '2026-01-01T00:00:00.000Z' }),
      '1 item',
    );
  });

  it('uses the plural noun for a multi-entity tag', () => {
    assert.equal(
      getSavedTagUsageMetadataLabel({ count: 4, tag: 'Warmup', createdAt: '2026-01-01T00:00:00.000Z' }),
      '4 items',
    );
  });
});

describe('getSavedTagUsageAddedDateLabel', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('omits the year when the added date falls in the current year', () => {
    assert.equal(
      getSavedTagUsageAddedDateLabel(
        { count: 1, tag: 'Soprano', createdAt: '2026-01-05T00:00:00.000Z' },
        now,
      ),
      'Added Jan 5',
    );
  });

  it('includes the year when the added date falls in a different year', () => {
    assert.equal(
      getSavedTagUsageAddedDateLabel(
        { count: 1, tag: 'Soprano', createdAt: '2025-01-05T00:00:00.000Z' },
        now,
      ),
      'Added Jan 5, 2025',
    );
  });
});

describe('getSavedTagUsageRowMetadataLabel', () => {
  it('combines the item count and added-date labels', () => {
    assert.equal(
      getSavedTagUsageRowMetadataLabel(
        { count: 4, tag: 'Warmup', createdAt: '2026-01-05T00:00:00.000Z' },
        new Date('2026-06-15T00:00:00.000Z'),
      ),
      '4 items · Added Jan 5',
    );
  });
});

describe('sortSavedTagUsage', () => {
  const tagUsage = [
    { count: 2, tag: 'Alto', createdAt: '2026-01-01T00:00:00.000Z' },
    { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
    { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  it('sorts by count descending with an alphabetical tie-break, matching the default aggregation order', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'desc', field: 'count' }),
      [
        { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'Alto', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    );
  });

  it('sorts by count ascending while keeping the tie-break alphabetical, not reversed', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'asc', field: 'count' }),
      [
        { count: 2, tag: 'Alto', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    );
  });

  it('sorts by name ascending case-insensitively', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'asc', field: 'name' }),
      [
        { count: 2, tag: 'Alto', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    );
  });

  it('sorts by name descending case-insensitively', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsage, { direction: 'desc', field: 'name' }),
      [
        { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'Alto', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    );
  });

  it('does not mutate the input array', () => {
    const original = [...tagUsage];

    sortSavedTagUsage(tagUsage, { direction: 'asc', field: 'name' });

    assert.deepEqual(tagUsage, original);
  });

  const tagUsageWithDistinctDates = [
    { count: 2, tag: 'Alto', createdAt: '2026-01-05T00:00:00.000Z' },
    { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
    { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  it('sorts by date ascending with an alphabetical tie-break for equal dates', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsageWithDistinctDates, { direction: 'asc', field: 'date' }),
      [
        { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'Alto', createdAt: '2026-01-05T00:00:00.000Z' },
      ],
    );
  });

  it('sorts by date descending while keeping the tie-break alphabetical, not reversed', () => {
    assert.deepEqual(
      sortSavedTagUsage(tagUsageWithDistinctDates, { direction: 'desc', field: 'date' }),
      [
        { count: 2, tag: 'Alto', createdAt: '2026-01-05T00:00:00.000Z' },
        { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
        { count: 2, tag: 'zebra', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
    );
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
    { count: 2, tag: 'Soprano', createdAt: '2026-01-01T00:00:00.000Z' },
    { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
    { count: 1, tag: 'sop2', createdAt: '2026-01-01T00:00:00.000Z' },
  ];

  it('returns every tag when the query is empty or whitespace-only', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, ''), tagUsage);
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, '   '), tagUsage);
  });

  it('matches tag names case-insensitively by substring', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, 'SOP'), [
      { count: 2, tag: 'Soprano', createdAt: '2026-01-01T00:00:00.000Z' },
      { count: 1, tag: 'sop2', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('trims surrounding whitespace from the query', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, '  bass  '), [
      { count: 5, tag: 'Bass', createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
  });

  it('returns an empty array when nothing matches', () => {
    assert.deepEqual(filterSavedTagUsageByQuery(tagUsage, 'alto'), []);
  });
});
