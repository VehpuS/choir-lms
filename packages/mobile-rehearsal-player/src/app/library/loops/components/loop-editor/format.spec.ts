/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatLoopEditorPrecise, formatLoopEditorScale } from './format.js';

describe('formatLoopEditorPrecise', () => {
  it('renders whole seconds with a tenths-of-a-second digit', () => {
    assert.equal(formatLoopEditorPrecise(0), '0:00.0');
    assert.equal(formatLoopEditorPrecise(1000), '0:01.0');
    assert.equal(formatLoopEditorPrecise(61000), '1:01.0');
  });

  it('surfaces each quarter-second nudge step as a visibly distinct value', () => {
    assert.equal(formatLoopEditorPrecise(250), '0:00.3');
    assert.equal(formatLoopEditorPrecise(500), '0:00.5');
    assert.equal(formatLoopEditorPrecise(750), '0:00.8');
  });

  it('carries rounding into the next second and minute', () => {
    assert.equal(formatLoopEditorPrecise(59950), '1:00.0');
  });

  it('clamps negative values to zero', () => {
    assert.equal(formatLoopEditorPrecise(-500), '0:00.0');
  });
});

describe('formatLoopEditorScale', () => {
  it('labels the track ends in minutes and seconds', () => {
    assert.equal(formatLoopEditorScale(278_000), '4:38');
    assert.equal(formatLoopEditorScale(0), '0:00');
  });
});
