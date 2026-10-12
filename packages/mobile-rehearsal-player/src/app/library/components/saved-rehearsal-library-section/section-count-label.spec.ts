import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatSectionCount } from './section-count-label';

describe('formatSectionCount', () => {
  it('reads `N of M` while a filter narrows the list', () => {
    assert.equal(formatSectionCount(1, 13), '1 of 13');
    assert.equal(formatSectionCount(0, 5), '0 of 5');
  });

  it('keeps the plain total when nothing is filtered out', () => {
    assert.equal(formatSectionCount(13, 13), '13');
    assert.equal(formatSectionCount(0, 0), '0');
  });
});
