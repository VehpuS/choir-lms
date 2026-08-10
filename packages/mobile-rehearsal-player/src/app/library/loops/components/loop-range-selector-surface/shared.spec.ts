/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatPreciseRangeLabel } from './shared';

describe('formatPreciseRangeLabel', () => {
  it('renders whole seconds with a tenths-of-a-second digit', () => {
    assert.equal(formatPreciseRangeLabel(0), '0:00.0');
    assert.equal(formatPreciseRangeLabel(1000), '0:01.0');
    assert.equal(formatPreciseRangeLabel(61000), '1:01.0');
  });

  it('surfaces each quarter-second nudge step as a visibly distinct value', () => {
    assert.equal(formatPreciseRangeLabel(250), '0:00.3');
    assert.equal(formatPreciseRangeLabel(500), '0:00.5');
    assert.equal(formatPreciseRangeLabel(750), '0:00.8');
    assert.equal(formatPreciseRangeLabel(1000), '0:01.0');
  });

  it('carries whole seconds into minutes without a double-rounding mismatch', () => {
    assert.equal(formatPreciseRangeLabel(59950), '1:00.0');
  });

  it('clamps negative values to zero', () => {
    assert.equal(formatPreciseRangeLabel(-500), '0:00.0');
  });
});
