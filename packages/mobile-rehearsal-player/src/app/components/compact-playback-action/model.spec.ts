/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPACT_PLAYBACK_ACTION_BACKGROUND,
  COMPACT_PLAYBACK_ACTION_BORDER,
  COMPACT_PLAYBACK_ACTION_HIT_SLOP,
  COMPACT_PLAYBACK_ACTION_ICON,
  getCompactPlaybackActionAccessibilityState,
  getCompactPlaybackActionVariantTokens,
  getCompactPlaybackActionVisualState,
} from './model.js';

describe('CompactPlaybackAction', () => {
  it('returns stable accessibility and visual state for compact playback buttons', () => {
    assert.deepEqual(
      getCompactPlaybackActionAccessibilityState({
        disabled: false,
        selected: true,
      }),
      {
        disabled: false,
        selected: true,
      },
    );
    assert.deepEqual(
      getCompactPlaybackActionAccessibilityState({
        disabled: true,
        selected: false,
      }),
      {
        disabled: true,
        selected: false,
      },
    );

    assert.deepEqual(
      getCompactPlaybackActionVisualState({
        disabled: false,
        pressed: true,
      }),
      {
        disabled: false,
        pressed: true,
      },
    );
    assert.deepEqual(
      getCompactPlaybackActionVisualState({
        disabled: true,
        pressed: true,
      }),
      {
        disabled: true,
        pressed: false,
      },
    );
  });

  it('keeps compact playback variants aligned with current row, card, and chip sizes', () => {
    assert.equal(COMPACT_PLAYBACK_ACTION_BORDER, '#d6d1c4');
    assert.equal(COMPACT_PLAYBACK_ACTION_BACKGROUND, '#fffdf8');
    assert.equal(COMPACT_PLAYBACK_ACTION_ICON, '#1f1c17');
    assert.equal(COMPACT_PLAYBACK_ACTION_HIT_SLOP, 4);

    assert.deepEqual(getCompactPlaybackActionVariantTokens('inline'), {
      borderRadius: 999,
      disabledOpacity: 0.56,
      iconSize: 18,
      minHeight: 36,
      minWidth: 38,
      paddingHorizontal: 12,
      pressedOpacity: 0.88,
    });
    assert.deepEqual(getCompactPlaybackActionVariantTokens('card'), {
      borderRadius: 999,
      disabledOpacity: 0.56,
      iconSize: 18,
      minHeight: 36,
      minWidth: 44,
      paddingHorizontal: 12,
      pressedOpacity: 0.88,
    });
    assert.deepEqual(getCompactPlaybackActionVariantTokens('row'), {
      borderRadius: 20,
      disabledOpacity: 0.45,
      height: 40,
      iconSize: 22,
      pressedOpacity: 0.75,
      width: 40,
    });
    assert.deepEqual(getCompactPlaybackActionVariantTokens('chip'), {
      borderRadius: 16,
      disabledOpacity: 0.45,
      height: 32,
      iconSize: 16,
      pressedOpacity: 0.75,
      width: 32,
    });
  });
});
