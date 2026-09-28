/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme.js';
import {
  INTERACTION_CARD_SHELL_TOKENS,
  INTERACTION_CHIP_TOKENS,
  INTERACTION_STATE_OPACITY,
} from './interaction-style-tokens.js';

const { colors } = appTheme;

describe('interaction style tokens', () => {
  it('keeps playlist, source, and menu surfaces aligned on shared card tokens', () => {
    assert.deepEqual(INTERACTION_STATE_OPACITY, {
      disabled: 0.56,
      pressed: 0.88,
    });
    assert.deepEqual(INTERACTION_CARD_SHELL_TOKENS, {
      borderColor: colors.border,
      mutedBackground: colors.surface,
      surfaceBackground: colors.bg,
    });
  });

  it('keeps shared chip variants aligned across recents and drive root selection', () => {
    assert.deepEqual(INTERACTION_CHIP_TOKENS, {
      actionText: colors.accentText,
      passiveBorder: colors.borderChip,
      passivePressedBackground: colors.neutral[700],
      passiveText: colors.textSecondary,
      selectedBorder: colors.accent,
      selectedText: colors.accentText,
      tagBackground: colors.surfaceAccent,
      tagText: colors.accentOnTint,
      transparent: colors.transparent,
    });
  });
});
