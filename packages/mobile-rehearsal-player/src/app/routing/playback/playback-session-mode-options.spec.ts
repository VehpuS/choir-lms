/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveVisibleRepeatModes } from './playback-session-mode-options.js';

describe('playback session mode options', () => {
  it('shows only single-item repeat controls when playback is standalone', () => {
    assert.deepEqual(resolveVisibleRepeatModes(false), ['off', 'one']);
  });

  it('shows full repeat controls when queued playback is active', () => {
    assert.deepEqual(resolveVisibleRepeatModes(true), ['off', 'one', 'all']);
  });
});
