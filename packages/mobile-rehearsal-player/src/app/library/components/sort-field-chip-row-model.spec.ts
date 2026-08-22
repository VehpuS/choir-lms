import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSortDirectionIcon } from './sort-field-chip-row-model';

describe('resolveSortDirectionIcon', () => {
  it('resolves the ascending icon for ascending direction', () => {
    assert.equal(resolveSortDirectionIcon('asc'), 'sort-ascending');
  });

  it('resolves the descending icon for descending direction', () => {
    assert.equal(resolveSortDirectionIcon('desc'), 'sort-descending');
  });
});
