/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveFeedbackCardPalette } from './feedback-card-model.js';

describe('feedback card model', () => {
  it('returns the expected palette for each tone', () => {
    assert.deepEqual(resolveFeedbackCardPalette('neutral'), {
      message: '#5f5647ee',
      surface: '#f6f1e7ee',
      title: '#1f1c17ee',
    });
    assert.deepEqual(resolveFeedbackCardPalette('ready'), {
      message: '#5f5647ee',
      surface: '#e7f2ecee',
      title: '#1f5c40ee',
    });
    assert.deepEqual(resolveFeedbackCardPalette('warning'), {
      message: '#5f5647ee',
      surface: '#fff4ddee',
      title: '#7f5b12ee',
    });
    assert.deepEqual(resolveFeedbackCardPalette('error'), {
      message: '#8a2d1fee',
      surface: '#fff1edee',
      title: '#8a2d1fee',
    });
  });
});
