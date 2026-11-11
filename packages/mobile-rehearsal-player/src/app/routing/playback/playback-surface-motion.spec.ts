import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPlaybackSurfaceMotion } from './playback-surface-motion.js';

describe('the playback surface motion', () => {
  it('rises from the bottom upright', () => {
    const motion = getPlaybackSurfaceMotion(false);

    assert.equal(motion.axis, 'y');
    assert.ok(motion.enterOffset > 0);
    assert.ok(motion.exitOffset > motion.enterOffset);
  });

  it('slides in from the trailing edge in a wide-short window', () => {
    const motion = getPlaybackSurfaceMotion(true);

    assert.equal(motion.axis, 'x');
    assert.ok(motion.enterOffset > 0);
    assert.ok(motion.exitOffset > motion.enterOffset);
  });
});
