/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  COMPACT_PLAYBACK_ACTION_BACKGROUND,
  COMPACT_PLAYBACK_ACTION_BORDER,
  COMPACT_PLAYBACK_ACTION_ICON,
  getCompactPlaybackActionAccessibilityState,
  getCompactPlaybackActionVariantTokens,
  getCompactPlaybackActionVisualState,
} from './model.js';
import { appTheme } from '../../utils/theme.js';

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

  it('renders the per-row play control as a soft accent ring, not a fill', () => {
    assert.equal(
      COMPACT_PLAYBACK_ACTION_BORDER,
      appTheme.colors.accentBorderSoft,
    );
    assert.equal(
      COMPACT_PLAYBACK_ACTION_BACKGROUND,
      appTheme.colors.transparent,
    );
    assert.equal(COMPACT_PLAYBACK_ACTION_ICON, appTheme.colors.accent);
  });

  it('keeps every variant at a 44pt press target even when the ring is smaller', () => {
    const touchTarget = appTheme.space.touchTarget;

    for (const variant of ['inline', 'card', 'row', 'chip'] as const) {
      const tokens = getCompactPlaybackActionVariantTokens(variant);
      // A ring is centered in a transparent box that is the press target;
      // `hitSlop` would not do, since react-native-web ignores it.
      const boxHeight = tokens.hitBox ?? tokens.minHeight ?? 0;
      const boxWidth = tokens.hitBox ?? tokens.minWidth ?? 0;

      assert.ok(boxHeight >= touchTarget, `${variant} height press target`);
      assert.ok(boxWidth >= touchTarget, `${variant} width press target`);
    }
  });

  it('gives row rings a 44pt layout box so adjacent controls never overlap', () => {
    const tokens = getCompactPlaybackActionVariantTokens('row');

    assert.equal(tokens.width, 34);
    assert.equal(tokens.hitBox, 44);
    assert.equal(tokens.margin, undefined);
    assert.deepEqual(getCompactPlaybackActionVariantTokens('inline'), tokens);
  });
});
