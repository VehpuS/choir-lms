/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getQueueModeChips } from './queue-mode-chips-model.js';

describe('queue mode chips', () => {
  it('lights the ordered side and leaves repeat dark for an ordered queue with repeat off', () => {
    const chips = getQueueModeChips({
      queueMode: 'ordered',
      repeatMode: 'off',
    });

    assert.deepEqual(
      chips.map((chip) => [chip.key, chip.label, chip.selected]),
      [
        ['ordered', 'Ordered', true],
        ['shuffle', 'Shuffle', false],
        ['repeat', 'Off', false],
      ],
    );
  });

  it('lights the shuffle side instead of the ordered side when shuffled', () => {
    const chips = getQueueModeChips({
      queueMode: 'shuffle',
      repeatMode: 'off',
    });

    assert.deepEqual(
      chips.map((chip) => chip.selected),
      [false, true, false],
    );
  });

  it('presses each queue mode chip to select its own mode', () => {
    const [ordered, shuffle] = getQueueModeChips({
      queueMode: 'shuffle',
      repeatMode: 'off',
    });

    assert.equal(ordered.mode, 'ordered');
    assert.equal(shuffle.mode, 'shuffle');
  });

  it('cycles the repeat chip off, one, all and back, with its own glyph for one', () => {
    const cycle = (['off', 'one', 'all'] as const).map((repeatMode) => {
      const repeat = getQueueModeChips({ queueMode: 'ordered', repeatMode })[2];

      return [repeat.label, repeat.icon, repeat.selected, repeat.mode];
    });

    assert.deepEqual(cycle, [
      ['Off', 'repeat', false, 'one'],
      ['One', 'repeat-once', true, 'all'],
      ['All', 'repeat', true, 'off'],
    ]);
  });

  it('keeps accessible names that state the repeat mode and what pressing it does', () => {
    const repeat = getQueueModeChips({
      queueMode: 'ordered',
      repeatMode: 'all',
    })[2];

    assert.equal(repeat.key, 'repeat');
    assert.ok('accessibilityHint' in repeat);
    assert.equal(repeat.accessibilityLabel, 'Repeat all');
    assert.equal(
      repeat.accessibilityHint,
      'Double tap to change to Repeat off',
    );
  });
});
