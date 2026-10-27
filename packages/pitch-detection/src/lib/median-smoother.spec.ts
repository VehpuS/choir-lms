import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMedianSmoother } from './median-smoother.ts';

describe('createMedianSmoother', () => {
  it('rejects a lone octave error', () => {
    const smoother = createMedianSmoother(5);
    const outputs = [57, 57, 69, 57, 57].map((value) => smoother.push(value));

    assert.equal(outputs.at(-1), 57);
  });

  it('follows a sustained change after half the window', () => {
    const smoother = createMedianSmoother(5);

    [57, 57, 57, 57, 57].forEach((value) => smoother.push(value));
    const outputs = [59, 59, 59].map((value) => smoother.push(value));

    assert.equal(outputs[1], 57);
    assert.equal(outputs[2], 59);
  });

  it('starts afresh after a reset', () => {
    const smoother = createMedianSmoother(5);

    [57, 57, 57].forEach((value) => smoother.push(value));
    smoother.reset();

    assert.equal(smoother.push(64), 64);
  });
});
