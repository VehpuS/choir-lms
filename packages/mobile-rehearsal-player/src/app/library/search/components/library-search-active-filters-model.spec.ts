import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveActiveFiltersSummaryLabel } from './library-search-active-filters-model';

describe('resolveActiveFiltersSummaryLabel', () => {
  it('labels an entity-filter-only selection', () => {
    assert.equal(
      resolveActiveFiltersSummaryLabel('tracks', [], 'all'),
      'Tracks',
    );
  });

  it('labels a tags-only selection with a pluralized count', () => {
    assert.equal(
      resolveActiveFiltersSummaryLabel('all', ['alto'], 'all'),
      '1 tag',
    );
    assert.equal(
      resolveActiveFiltersSummaryLabel('all', ['alto', 'bass'], 'all'),
      '2 tags',
    );
  });

  it('suffixes the tags-only label with (any) only when match mode is any', () => {
    assert.equal(
      resolveActiveFiltersSummaryLabel('all', ['alto', 'bass'], 'any'),
      '2 tags (any)',
    );
    assert.equal(
      resolveActiveFiltersSummaryLabel('all', ['alto'], 'any'),
      '1 tag (any)',
    );
  });

  it('joins entity-filter and tags labels when both are active', () => {
    assert.equal(
      resolveActiveFiltersSummaryLabel('loops', ['alto', 'bass'], 'all'),
      'Loops • 2 tags',
    );
    assert.equal(
      resolveActiveFiltersSummaryLabel('loops', ['alto', 'bass'], 'any'),
      'Loops • 2 tags (any)',
    );
  });

  it('returns null when no filter is active', () => {
    assert.equal(resolveActiveFiltersSummaryLabel('all', [], 'all'), null);
  });
});
