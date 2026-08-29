/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveRepeatToggleModel,
  resolveVisibleRepeatModes,
} from './playback-session-mode-options.js';

describe('playback session mode options', () => {
  it('shows only single-item repeat controls when playback is standalone', () => {
    assert.deepEqual(resolveVisibleRepeatModes(false), ['off', 'one']);
  });

  it('shows full repeat controls when queued playback is active', () => {
    assert.deepEqual(resolveVisibleRepeatModes(true), ['off', 'one', 'all']);
  });

  it('shows repeat-one with its own dedicated icon, never shuffle or a slashed glyph', () => {
    const model = resolveRepeatToggleModel('one', ['off', 'one', 'all']);

    assert.equal(model.icon, 'repeat-once');
    assert.notEqual(model.icon, 'shuffle');
    assert.notEqual(model.icon, 'repeat-off');
  });

  it('shows off and all as the same repeat glyph, distinguished only by selected styling', () => {
    const off = resolveRepeatToggleModel('off', ['off', 'one', 'all']);
    const all = resolveRepeatToggleModel('all', ['off', 'one', 'all']);

    assert.equal(off.icon, 'repeat');
    assert.equal(all.icon, 'repeat');
    assert.notEqual(off.icon, 'shuffle');
    assert.notEqual(off.icon, 'repeat-off');
    assert.equal(off.selected, false);
    assert.equal(all.selected, true);
  });

  it('cycles off -> one -> all -> off when every mode is visible', () => {
    assert.equal(
      resolveRepeatToggleModel('off', ['off', 'one', 'all']).nextMode,
      'one',
    );
    assert.equal(
      resolveRepeatToggleModel('one', ['off', 'one', 'all']).nextMode,
      'all',
    );
    assert.equal(
      resolveRepeatToggleModel('all', ['off', 'one', 'all']).nextMode,
      'off',
    );
  });

  it('cycles off -> one -> off when standalone playback only exposes off/one', () => {
    assert.equal(
      resolveRepeatToggleModel('off', ['off', 'one']).nextMode,
      'one',
    );
    assert.equal(
      resolveRepeatToggleModel('one', ['off', 'one']).nextMode,
      'off',
    );
  });

  it('labels each state by its current mode, not the pending action', () => {
    assert.equal(
      resolveRepeatToggleModel('off', ['off', 'one', 'all']).accessibilityLabel,
      'Repeat off',
    );
    assert.equal(
      resolveRepeatToggleModel('one', ['off', 'one', 'all']).accessibilityLabel,
      'Repeat one',
    );
    assert.equal(
      resolveRepeatToggleModel('all', ['off', 'one', 'all']).accessibilityLabel,
      'Repeat all',
    );
  });
});
