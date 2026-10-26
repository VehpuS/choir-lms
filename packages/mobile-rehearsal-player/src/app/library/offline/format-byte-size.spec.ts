import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatByteSize } from './format-byte-size.js';

describe('formatByteSize', () => {
  it('reads the spec examples', () => {
    assert.equal(formatByteSize(3_400_000), '3.2 MB');
    assert.equal(formatByteSize(812_000), '793 KB');
  });

  it('uses one decimal under 10 and none above', () => {
    assert.equal(formatByteSize(5 * 1024 * 1024), '5.0 MB');
    assert.equal(formatByteSize(212 * 1024 * 1024), '212 MB');
  });

  it('never shows a bare byte count above 1023', () => {
    assert.equal(formatByteSize(0), '0 B');
    assert.equal(formatByteSize(1023), '1023 B');
    assert.equal(formatByteSize(1024), '1.0 KB');
    assert.equal(formatByteSize(2 * 1024 ** 3), '2.0 GB');
  });
});
