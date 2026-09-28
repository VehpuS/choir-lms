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

  it('keeps every variant at a 44pt hit area even when the ring is smaller', () => {
    const touchTarget = appTheme.space.touchTarget;

    for (const variant of ['inline', 'card', 'row', 'chip'] as const) {
      const tokens = getCompactPlaybackActionVariantTokens(variant);
      const visualHeight = tokens.height ?? tokens.minHeight ?? 0;
      const visualWidth = tokens.width ?? tokens.minWidth ?? 0;

      assert.ok(
        visualHeight + tokens.hitSlop * 2 >= touchTarget,
        `${variant} height hit area`,
      );
      assert.ok(
        visualWidth + tokens.hitSlop * 2 >= touchTarget,
        `${variant} width hit area`,
      );
    }
  });

  it('pads row rings out to a 44pt layout box so adjacent controls never overlap', () => {
    const tokens = getCompactPlaybackActionVariantTokens('row');

    assert.equal(tokens.width, 34);
    assert.equal((tokens.width ?? 0) + (tokens.margin ?? 0) * 2, 44);
    assert.deepEqual(getCompactPlaybackActionVariantTokens('inline'), tokens);
  });
});
