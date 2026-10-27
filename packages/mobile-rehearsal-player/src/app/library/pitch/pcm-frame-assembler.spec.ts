import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFrameAssembler } from './pcm-frame-assembler.js';

const SAMPLE_RATE = 48000;
const BLOCK = 128;

/** Pushes a counting ramp in 128-sample blocks and returns all frames. */
const pushRamp = (
  assembler: ReturnType<typeof createFrameAssembler>,
  totalSamples: number,
) => {
  const frames = [];

  for (let start = 0; start < totalSamples; start += BLOCK) {
    const block = Float32Array.from({ length: BLOCK }, (_, i) => start + i);

    frames.push(...assembler.push(block, start / SAMPLE_RATE, SAMPLE_RATE));
  }

  return frames;
};

describe('createFrameAssembler', () => {
  it('delivers nothing until a full frame has arrived', () => {
    assert.equal(pushRamp(createFrameAssembler(512, 256), 384).length, 0);
  });

  it('delivers a frame every hop once full', () => {
    // 512 fills the first frame, then one more every 256 samples.
    assert.equal(pushRamp(createFrameAssembler(512, 256), 1280).length, 4);
  });

  it('keeps samples in capture order across the ring wrap', () => {
    const frames = pushRamp(createFrameAssembler(512, 256), 1280);

    frames.forEach((frame, index) => {
      const firstSample = index * 256;

      assert.equal(frame.samples[0], firstSample);
      assert.equal(frame.samples[511], firstSample + 511);
    });
  });

  it('stamps each frame with the capture time of its last sample', () => {
    const [first, second] = pushRamp(createFrameAssembler(512, 256), 1280);

    assert.ok(Math.abs(first.captureTimeSec - 512 / SAMPLE_RATE) < 1e-9);
    assert.ok(Math.abs(second.captureTimeSec - 768 / SAMPLE_RATE) < 1e-9);
    assert.equal(first.sampleRate, SAMPLE_RATE);
  });

  it('starts over after a reset', () => {
    const assembler = createFrameAssembler(512, 256);

    pushRamp(assembler, 384);
    assembler.reset();

    assert.equal(pushRamp(assembler, 384).length, 0);
  });
});
