import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveActiveFiltersSummaryLabel } from './library-search-active-filters-model';

describe('resolveActiveFiltersSummaryLabel', () => {
  it('labels an entity-filter-only selection', () => {
    assert.equal(resolveActiveFiltersSummaryLabel('tracks', []), 'Tracks');
  });

  it('labels a tags-only selection with a pluralized count', () => {
    assert.equal(resolveActiveFiltersSummaryLabel('all', ['alto']), '1 tag');
    assert.equal(
      resolveActiveFiltersSummaryLabel('all', ['alto', 'bass']),
      '2 tags',
    );
  });

  it('joins entity-filter and tags labels when both are active', () => {
    assert.equal(
      resolveActiveFiltersSummaryLabel('loops', ['alto', 'bass']),
      'Loops • 2 tags',
    );
  });

  it('returns null when no filter is active', () => {
    assert.equal(resolveActiveFiltersSummaryLabel('all', []), null);
  });
});
