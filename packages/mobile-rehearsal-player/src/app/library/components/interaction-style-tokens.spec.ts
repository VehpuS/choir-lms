/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme.js';
import {
  INTERACTION_ACTION_BUTTON_TOKENS,
  INTERACTION_CARD_SHELL_TOKENS,
  INTERACTION_CHIP_TOKENS,
  INTERACTION_STATE_OPACITY,
} from './interaction-style-tokens.js';

const { colors } = appTheme;

describe('interaction style tokens', () => {
  it('keeps playlist, source, and menu surfaces aligned on shared card and button tokens', () => {
    assert.deepEqual(INTERACTION_STATE_OPACITY, {
      disabled: 0.56,
      pressed: 0.88,
    });
    assert.deepEqual(INTERACTION_CARD_SHELL_TOKENS, {
      borderColor: colors.border,
      mutedBackground: colors.surface,
      surfaceBackground: colors.bg,
    });
    assert.deepEqual(INTERACTION_ACTION_BUTTON_TOKENS, {
      destructive: {
        background: colors.dangerFill,
        text: colors.danger,
      },
      primary: {
        background: colors.surfaceAccent,
        text: colors.accentOnTint,
      },
      secondary: {
        background: colors.surface,
        text: colors.text,
      },
    });
  });

  it('keeps shared chip variants aligned across recents and drive root selection', () => {
    assert.deepEqual(INTERACTION_CHIP_TOKENS, {
      actionText: colors.accentText,
      passiveBackground: colors.surface,
      passivePressedBackground: colors.neutral[700],
      passiveText: colors.textSecondary,
      selectedBackground: colors.surfaceAccent,
      selectedText: colors.accentOnTint,
    });
  });
});
