/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { prewarmSavedTrackPlayer } from './saved-track-player-prewarm.js';

const createEnsureReady = (result: 'resolve' | 'reject') => {
  const calls: number[] = [];

  return {
    calls,
    ensureReady() {
      calls.push(calls.length + 1);

      return result === 'resolve'
        ? Promise.resolve()
        : Promise.reject(new Error('setup failed'));
    },
  };
};

describe('prewarmSavedTrackPlayer', () => {
  it('starts player setup on web', () => {
    const setup = createEnsureReady('resolve');

    assert.equal(
      prewarmSavedTrackPlayer({
        ensureReady: setup.ensureReady,
        isSupported: true,
        platformOs: 'web',
      }),
      true,
    );
    assert.equal(setup.calls.length, 1);
  });

  it('leaves native setup until the first load', () => {
    const setup = createEnsureReady('resolve');

    assert.equal(
      prewarmSavedTrackPlayer({
        ensureReady: setup.ensureReady,
        isSupported: true,
        platformOs: 'ios',
      }),
      false,
    );
    assert.equal(setup.calls.length, 0);
  });

  it('does nothing where the player is unsupported', () => {
    const setup = createEnsureReady('resolve');

    assert.equal(
      prewarmSavedTrackPlayer({
        ensureReady: setup.ensureReady,
        isSupported: false,
        platformOs: 'web',
      }),
      false,
    );
    assert.equal(setup.calls.length, 0);
  });

  it('swallows a failed warm-up so the first load can report it', async () => {
    const setup = createEnsureReady('reject');

    prewarmSavedTrackPlayer({
      ensureReady: setup.ensureReady,
      isSupported: true,
      platformOs: 'web',
    });

    // An unhandled rejection would fail the test run.
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(setup.calls.length, 1);
  });
});
