/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveFeedbackCardPalette } from './feedback-card-model.js';

describe('feedback card model', () => {
  it('returns the expected palette for each tone', () => {
    assert.deepEqual(resolveFeedbackCardPalette('neutral'), {
      message: '#5f5647',
      surface: '#f6f1e7',
      title: '#1f1c17',
    });
    assert.deepEqual(resolveFeedbackCardPalette('ready'), {
      message: '#5f5647',
      surface: '#e7f2ec',
      title: '#1f5c40',
    });
    assert.deepEqual(resolveFeedbackCardPalette('warning'), {
      message: '#5f5647',
      surface: '#fff4dd',
      title: '#7f5b12',
    });
    assert.deepEqual(resolveFeedbackCardPalette('error'), {
      message: '#8a2d1f',
      surface: '#fff1ed',
      title: '#8a2d1f',
    });
  });
});
