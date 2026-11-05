import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  describeMixEstimate,
  getMixEstimate,
} from './recording-export-estimate.js';

describe('mix estimate', () => {
  it('sizes a mix as 16-bit stereo for the recording length', () => {
    // One minute: 60 s x 44,100 frames x 4 bytes.
    assert.equal(
      getMixEstimate([{ durationMs: 60_000 }]).sizeBytes,
      10_584_000,
    );
  });

  it('adds up several recordings and never promises less than a second', () => {
    const estimate = getMixEstimate([{ durationMs: 100 }, { durationMs: 200 }]);

    assert.equal(estimate.renderSeconds, 1);
    assert.equal(estimate.sizeBytes, Math.round(0.3 * 44_100 * 4));
  });

  it('says about how big and how long, in minutes for a long render', () => {
    assert.equal(
      describeMixEstimate([{ durationMs: 60_000 }]),
      'About 10.1 MB, ready in about 3 s.',
    );
    assert.ok(
      describeMixEstimate([{ durationMs: 30 * 60_000 }]).endsWith(
        'about 2 min.',
      ),
    );
  });
});
