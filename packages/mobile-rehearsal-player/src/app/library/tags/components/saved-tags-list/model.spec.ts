import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getSavedTagUsageMetadataLabel } from './model';

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
