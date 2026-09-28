/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme.js';
import { resolveInteractionChipPalette } from './interaction-chip-model.js';

const { colors } = appTheme;

describe('interaction chip model', () => {
  it('renders a passive chip as a neutral outline on the ground', () => {
    assert.deepEqual(resolveInteractionChipPalette('passive'), {
      background: colors.transparent,
      border: colors.borderChip,
      isEmphasized: false,
      pressedBackground: colors.neutral[700],
      text: colors.textSecondary,
    });
  });

  it('marks a selected chip with an accent outline and label, never an accent fill', () => {
    assert.deepEqual(resolveInteractionChipPalette('selected'), {
      background: colors.transparent,
      border: colors.accent,
      isEmphasized: true,
      pressedBackground: colors.neutral[700],
      text: colors.accentText,
    });
  });

  it('keeps an action chip on the passive outline with accent text', () => {
    assert.deepEqual(resolveInteractionChipPalette('action'), {
      background: colors.transparent,
      border: colors.borderChip,
      isEmphasized: false,
      pressedBackground: colors.neutral[700],
      text: colors.accentText,
    });
  });

  it('fills a chosen tag chip with the accent tint', () => {
    assert.deepEqual(resolveInteractionChipPalette('tag'), {
      background: colors.surfaceAccent,
      border: colors.surfaceAccent,
      isEmphasized: true,
      pressedBackground: colors.surfaceAccent,
      text: colors.accentOnTint,
    });
  });
});
