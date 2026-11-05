import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMixLimiter } from './mix-limiter.ts';
import {
  MIX_LIMITER_PROCESSOR_NAME,
  getMixLimiterWorkletSource,
} from './mix-limiter-worklet.ts';

const SAMPLE_RATE = 48_000;
const BLOCK = 128;

type Processor = {
  process: (inputs: Float32Array[][], outputs: Float32Array[][]) => boolean;
};

/** Evaluates the worklet source the way a worklet scope would, with its globals stubbed. */
const loadProcessor = (): { name: string; create: () => Processor } => {
  let registered: { name: string; ctor: new () => Processor } | null = null;
  // The worklet scope's `AudioWorkletProcessor` is a bare base class.
  class AudioWorkletProcessor {}
  const run = new Function(
    'AudioWorkletProcessor',
    'registerProcessor',
    'sampleRate',
    getMixLimiterWorkletSource(),
  );

  run(
    AudioWorkletProcessor,
    (name: string, ctor: new () => Processor) => {
      registered = { name, ctor };
    },
    SAMPLE_RATE,
  );

  if (!registered) {
    throw new Error('The worklet registered nothing');
  }

  const { ctor, name } = registered as {
    name: string;
    ctor: new () => Processor;
  };

  return { name, create: () => new ctor() };
};

const loudStereo = (frames: number) => {
  const interleaved = new Float32Array(frames * 2);

  for (let frame = 0; frame < frames; frame += 1) {
    const swell = 0.4 + 1.4 * Math.abs(Math.sin(frame / 6000));

    interleaved[frame * 2] = swell * Math.sin(frame * 0.07);
    interleaved[frame * 2 + 1] = 0.8 * swell * Math.sin(frame * 0.05 + 1);
  }

  return interleaved;
};

describe('mix limiter worklet', () => {
  it('registers under the name the overlay asks for', () => {
    assert.equal(loadProcessor().name, MIX_LIMITER_PROCESSOR_NAME);
  });

  it('matches the exported mix limiter sample for sample', () => {
    const frames = BLOCK * 400;
    const source = loudStereo(frames);
    const expected = Float32Array.from(source);

    createMixLimiter(SAMPLE_RATE).process(expected, 2);

    const processor = loadProcessor().create();
    const actual = new Float32Array(source.length);

    for (let start = 0; start < frames; start += BLOCK) {
      const inputs = [[new Float32Array(BLOCK), new Float32Array(BLOCK)]];
      const outputs = [[new Float32Array(BLOCK), new Float32Array(BLOCK)]];

      for (let frame = 0; frame < BLOCK; frame += 1) {
        inputs[0][0][frame] = source[(start + frame) * 2];
        inputs[0][1][frame] = source[(start + frame) * 2 + 1];
      }

      processor.process(inputs, outputs);

      for (let frame = 0; frame < BLOCK; frame += 1) {
        actual[(start + frame) * 2] = outputs[0][0][frame];
        actual[(start + frame) * 2 + 1] = outputs[0][1][frame];
      }
    }

    let worst = 0;

    for (let index = 0; index < actual.length; index += 1) {
      worst = Math.max(worst, Math.abs(actual[index] - expected[index]));
    }

    assert.ok(worst < 1e-6, `worst difference ${worst}`);
    assert.ok(
      actual.every((sample) => Math.abs(sample) < 1),
      'nothing reaches full scale',
    );
  });

  it('leaves quiet audio untouched, with no make-up gain', () => {
    const processor = loadProcessor().create();
    const input = [[Float32Array.from({ length: BLOCK }, () => 0.1)]];
    const output = [[new Float32Array(BLOCK)]];

    processor.process(input, output);

    assert.ok(output[0][0].every((sample) => Math.abs(sample - 0.1) < 1e-7));
  });
});
