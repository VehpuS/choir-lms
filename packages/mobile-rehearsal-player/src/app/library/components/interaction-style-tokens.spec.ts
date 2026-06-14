/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  INTERACTION_ACTION_BUTTON_TOKENS,
  INTERACTION_CARD_SHELL_TOKENS,
  INTERACTION_CHIP_TOKENS,
  INTERACTION_STATE_OPACITY,
} from './interaction-style-tokens.js';

describe('interaction style tokens', () => {
  it('keeps playlist, source, and menu surfaces aligned on shared card and button tokens', () => {
    assert.deepEqual(INTERACTION_STATE_OPACITY, {
      disabled: 0.56,
      pressed: 0.88,
    });
    assert.deepEqual(INTERACTION_CARD_SHELL_TOKENS, {
      borderColor: '#d6d1c4',
      mutedBackground: '#faf6ee',
      surfaceBackground: '#fffdf8',
    });
    assert.deepEqual(INTERACTION_ACTION_BUTTON_TOKENS, {
      destructive: {
        background: '#fff1ed',
        text: '#8a2d1f',
      },
      primary: {
        background: '#305c4d',
        text: '#fff8ef',
      },
      secondary: {
        background: '#f2ece1',
        text: '#1f1c17',
      },
    });
  });

  it('keeps shared chip variants aligned across recents and drive root selection', () => {
    assert.deepEqual(INTERACTION_CHIP_TOKENS, {
      actionText: '#2f5a4b',
      passiveBackground: '#f2ece1',
      passivePressedBackground: '#e3dac9',
      passiveText: '#5f5647',
      selectedBackground: '#173229',
      selectedText: '#fff8ef',
    });
  });
});
