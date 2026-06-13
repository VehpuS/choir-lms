/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING,
  getCompactPlayableRowShellLayout,
} from './model.js';

describe('compact playable row shell layout', () => {
  it('keeps card overflow top-right and reserves title space when present', () => {
    assert.deepEqual(
      getCompactPlayableRowShellLayout({
        hasOverflowTrigger: true,
        variant: 'card',
      }),
      {
        overflowPlacement: 'top-right',
        titleTrailingPadding: COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING,
      },
    );
    assert.deepEqual(
      getCompactPlayableRowShellLayout({
        hasOverflowTrigger: false,
        variant: 'card',
      }),
      {
        overflowPlacement: 'top-right',
        titleTrailingPadding: 0,
      },
    );
  });

  it('keeps row overflow in trailing actions without extra title padding', () => {
    assert.equal(COMPACT_PLAYABLE_ROW_CARD_TITLE_TRAILING_PADDING, 44);
    assert.deepEqual(
      getCompactPlayableRowShellLayout({
        hasOverflowTrigger: true,
        variant: 'row',
      }),
      {
        overflowPlacement: 'trailing-actions',
        titleTrailingPadding: 0,
      },
    );
  });
});
