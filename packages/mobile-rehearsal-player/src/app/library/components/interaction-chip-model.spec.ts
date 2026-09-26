/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme.js';
import { resolveInteractionChipPalette } from './interaction-chip-model.js';

const { colors } = appTheme;

describe('interaction chip model', () => {
  it('returns passive palette for passive variant', () => {
    assert.deepEqual(resolveInteractionChipPalette('passive'), {
      background: colors.surface,
      pressedBackground: colors.neutral[700],
      text: colors.textSecondary,
    });
  });

  it('returns selected palette for selected variant', () => {
    assert.deepEqual(resolveInteractionChipPalette('selected'), {
      background: colors.surfaceAccent,
      pressedBackground: colors.surfaceAccent,
      text: colors.accentOnTint,
    });
  });

  it('returns action palette for action variant', () => {
    assert.deepEqual(resolveInteractionChipPalette('action'), {
      background: colors.surface,
      pressedBackground: colors.neutral[700],
      text: colors.accentText,
    });
  });
});
