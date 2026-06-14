/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveInteractionChipPalette } from './interaction-chip-model.js';

describe('interaction chip model', () => {
  it('returns passive palette for passive variant', () => {
    assert.deepEqual(resolveInteractionChipPalette('passive'), {
      background: '#f2ece1',
      pressedBackground: '#e3dac9',
      text: '#5f5647',
    });
  });

  it('returns selected palette for selected variant', () => {
    assert.deepEqual(resolveInteractionChipPalette('selected'), {
      background: '#173229',
      pressedBackground: '#173229',
      text: '#fff8ef',
    });
  });

  it('returns action palette for action variant', () => {
    assert.deepEqual(resolveInteractionChipPalette('action'), {
      background: '#f2ece1',
      pressedBackground: '#e3dac9',
      text: '#2f5a4b',
    });
  });
});