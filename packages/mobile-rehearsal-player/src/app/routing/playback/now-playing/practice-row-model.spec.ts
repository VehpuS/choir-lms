/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPracticeTiles } from './practice-row-model.js';

describe('playback practice row model', () => {
  it('shows only the repeat tile for standalone playback, cycling off and one', () => {
    const tiles = getPracticeTiles({ queueMode: null, repeatMode: 'off' });

    assert.deepEqual(
      tiles.map((tile) => tile.key),
      ['repeat'],
    );
    assert.equal(tiles[0]?.nextMode, 'one');
    assert.equal(
      getPracticeTiles({ queueMode: null, repeatMode: 'one' })[0]?.nextMode,
      'off',
    );
  });

  it('shows repeat then shuffle for queued playback', () => {
    const tiles = getPracticeTiles({
      queueMode: 'ordered',
      repeatMode: 'all',
    });

    assert.deepEqual(
      tiles.map((tile) => tile.key),
      ['repeat', 'shuffle'],
    );
    assert.equal(tiles[0]?.nextMode, 'off');
  });

  it('marks the repeat tile active whenever repeat is on', () => {
    assert.equal(
      getPracticeTiles({ queueMode: null, repeatMode: 'off' })[0]?.selected,
      false,
    );
    assert.equal(
      getPracticeTiles({ queueMode: null, repeatMode: 'one' })[0]?.selected,
      true,
    );
  });

  it('keeps repeat-one on its own glyph, distinct from shuffle', () => {
    const [repeatTile, shuffleTile] = getPracticeTiles({
      queueMode: 'ordered',
      repeatMode: 'one',
    });

    assert.equal(repeatTile?.icon, 'repeat-once');
    assert.equal(shuffleTile?.icon, 'shuffle');
  });

  it('toggles shuffle and labels the tile by the action it takes', () => {
    const ordered = getPracticeTiles({
      queueMode: 'ordered',
      repeatMode: 'off',
    })[1];
    const shuffled = getPracticeTiles({
      queueMode: 'shuffle',
      repeatMode: 'off',
    })[1];

    assert.deepEqual(
      [ordered?.nextMode, ordered?.selected, ordered?.accessibilityLabel],
      ['shuffle', false, 'Enable shuffle playback'],
    );
    assert.deepEqual(
      [shuffled?.nextMode, shuffled?.selected, shuffled?.accessibilityLabel],
      ['ordered', true, 'Disable shuffle playback'],
    );
  });
});
