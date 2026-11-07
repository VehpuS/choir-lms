import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPOSITE_UNAVAILABLE_MESSAGE,
  resolveCompositeAvailability,
  resolveCompositeCapabilities,
} from './composite-capabilities.js';

const full = {
  hasAudioContext: true,
  hasAudioWorklet: true,
  hasIndexedDb: true,
};

describe('composite capabilities', () => {
  it('plays composites on web with Web Audio, audio worklets and IndexedDB', () => {
    assert.deepEqual(
      resolveCompositeCapabilities({ platformOs: 'web', ...full }),
      { canPlayComposites: true },
    );
  });

  it('does not play on web when any one capability is missing', () => {
    for (const missing of Object.keys(full) as (keyof typeof full)[]) {
      assert.equal(
        resolveCompositeCapabilities({
          platformOs: 'web',
          ...full,
          [missing]: false,
        }).canPlayComposites,
        false,
        missing,
      );
    }
  });

  it('does not play on native', () => {
    for (const platformOs of ['ios', 'android']) {
      assert.equal(
        resolveCompositeCapabilities({ platformOs, ...full }).canPlayComposites,
        false,
      );
    }
  });

  it('does not play without a platform', () => {
    assert.equal(
      resolveCompositeCapabilities({ platformOs: null, ...full })
        .canPlayComposites,
      false,
    );
  });
});

describe('composite availability', () => {
  it('is available where composites play', () => {
    assert.deepEqual(
      resolveCompositeAvailability({ canPlayComposites: true }),
      { available: true },
    );
  });

  it('is unavailable with the message where they do not', () => {
    assert.deepEqual(
      resolveCompositeAvailability({ canPlayComposites: false }),
      { available: false, message: COMPOSITE_UNAVAILABLE_MESSAGE },
    );
    assert.match(COMPOSITE_UNAVAILABLE_MESSAGE, /web/);
  });
});
