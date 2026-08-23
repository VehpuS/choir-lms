import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveEntityFilterOnViewChange } from './entity-filter-view-change';

describe('resolveEntityFilterOnViewChange', () => {
  it('resets to all when no search is active', () => {
    assert.equal(resolveEntityFilterOnViewChange(null, 'tracks'), 'all');
  });

  it('leaves the filter untouched while a search is active', () => {
    assert.equal(resolveEntityFilterOnViewChange('warmup', 'tracks'), 'tracks');
  });

  it('is a no-op when the filter is already all and no search is active', () => {
    assert.equal(resolveEntityFilterOnViewChange(null, 'all'), 'all');
  });
});
