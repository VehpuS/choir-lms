import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPitchyEstimator } from './pitch-estimator.ts';
import {
  renderNoise,
  renderSine,
  renderSilence,
  TEST_FRAME_SIZE,
  TEST_SAMPLE_RATE,
} from './synthetic-voice.ts';

const frameOf = (samples: Float32Array) => samples.subarray(0, TEST_FRAME_SIZE);

describe('createPitchyEstimator', () => {
  it('finds the frequency of a sine across the voice range', () => {
    const estimator = createPitchyEstimator();

    for (const frequencyHz of [82.41, 196, 440, 880]) {
      const estimate = estimator.estimate(
        frameOf(renderSine(frequencyHz, 0.2)),
        TEST_SAMPLE_RATE,
      );

      assert.ok(estimate, `no estimate for ${frequencyHz} Hz`);
      assert.ok(
        Math.abs(estimate.frequencyHz - frequencyHz) / frequencyHz < 0.005,
        `${frequencyHz} Hz estimated as ${estimate.frequencyHz}`,
      );
      assert.ok(estimate.clarity > 0.95);
    }
  });

  it('is much less clear about noise than about a tone', () => {
    const estimator = createPitchyEstimator();
    const tone = estimator.estimate(
      frameOf(renderSine(300, 0.2)),
      TEST_SAMPLE_RATE,
    );
    const noise = estimator.estimate(
      frameOf(renderNoise(0.2)),
      TEST_SAMPLE_RATE,
    );

    assert.ok(tone);
    assert.ok((noise?.clarity ?? 0) < 0.7);
  });

  it('returns nothing for silence or an empty frame', () => {
    const estimator = createPitchyEstimator();

    assert.equal(
      estimator.estimate(frameOf(renderSilence(0.2)), TEST_SAMPLE_RATE)
        ?.clarity ?? 0,
      0,
    );
    assert.equal(
      estimator.estimate(new Float32Array(0), TEST_SAMPLE_RATE),
      null,
    );
  });

  it('handles frames of different lengths', () => {
    const estimator = createPitchyEstimator();
    const samples = renderSine(440, 0.2);

    for (const length of [1024, 2048]) {
      const estimate = estimator.estimate(
        samples.subarray(0, length),
        TEST_SAMPLE_RATE,
      );

      assert.ok(Math.abs((estimate?.frequencyHz ?? 0) - 440) < 3);
    }
  });
});
