/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appTheme } from '../../utils/theme.js';
import { resolveFeedbackCardPalette } from './feedback-card-model.js';

const { colors } = appTheme;

describe('feedback card model', () => {
  it('keeps the neutral tone on the plain surface', () => {
    assert.deepEqual(resolveFeedbackCardPalette('neutral'), {
      edge: colors.border,
      message: colors.textMuted,
      surface: colors.surface,
      title: colors.text,
    });
  });

  it('tints each status tone with its own status hue', () => {
    assert.deepEqual(resolveFeedbackCardPalette('ready'), {
      edge: colors.successEdge,
      message: colors.textSecondary,
      surface: colors.successFill,
      title: colors.success,
    });
    assert.deepEqual(resolveFeedbackCardPalette('warning'), {
      edge: colors.warningEdge,
      message: colors.textSecondary,
      surface: colors.warningFill,
      title: colors.warning,
    });
    assert.deepEqual(resolveFeedbackCardPalette('error'), {
      edge: colors.dangerEdge,
      message: colors.danger,
      surface: colors.dangerFill,
      title: colors.danger,
    });
  });
});
