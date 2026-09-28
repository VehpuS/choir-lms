/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme.js';
import {
  OUTLINED_ACTION_BUTTON_MIN_HEIGHT,
  getOutlinedActionButtonVisualState,
  resolveOutlinedActionButtonPalette,
} from './model.js';

const { colors } = appTheme;

describe('OutlinedActionButton', () => {
  it('outlines the primary action in the accent with body-safe accent text', () => {
    assert.deepEqual(resolveOutlinedActionButtonPalette('accent'), {
      border: colors.accent,
      label: colors.accentText,
    });
  });

  it('keeps secondary and destructive actions on neutral and danger outlines', () => {
    assert.deepEqual(resolveOutlinedActionButtonPalette('neutral'), {
      border: colors.borderButton,
      label: colors.text,
    });
    assert.deepEqual(resolveOutlinedActionButtonPalette('destructive'), {
      border: colors.dangerEdge,
      label: colors.danger,
    });
  });

  it('keeps the hit area at the 44pt minimum', () => {
    assert.equal(OUTLINED_ACTION_BUTTON_MIN_HEIGHT, 44);
  });

  it('suppresses pressed feedback while disabled', () => {
    assert.deepEqual(
      getOutlinedActionButtonVisualState({ disabled: true, pressed: true }),
      { disabled: true, pressed: false },
    );
    assert.deepEqual(
      getOutlinedActionButtonVisualState({ disabled: false, pressed: true }),
      { disabled: false, pressed: true },
    );
  });
});
