import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { midiToFrequency } from '@org/audio-library-models';

import { createPitchyEstimator } from './pitch-estimator.ts';
import {
  createPitchPipeline,
  type PitchPipeline,
  type PitchReading,
} from './pitch-pipeline.ts';
import {
  concatSamples,
  renderNoise,
  renderSilence,
  renderSine,
  renderTone,
  toFrames,
} from './synthetic-voice.ts';

const A3 = 57;

const newPipeline = (
  options: { sensitivity?: 'low' | 'normal' | 'high' } = {},
) => {
  return createPitchPipeline({
    estimator: createPitchyEstimator(),
    ...options,
  });
};

const readings = (pipeline: PitchPipeline, samples: Float32Array) => {
  return toFrames(samples).map((frame) => pipeline.process(frame));
};

const last = (items: PitchReading[]) => items[items.length - 1];

describe('createPitchPipeline', () => {
  it('reads a steady note as its name, in tune', () => {
    const result = last(
      readings(newPipeline(), renderSine(midiToFrequency(A3), 1)),
    );

    assert.ok(result.active);
    assert.equal(result.midi, A3);
    assert.ok(Math.abs(result.cents) < 2);
  });

  it('reports a flat note with a negative offset', () => {
    const flat = midiToFrequency(A3) * 2 ** (-10 / 1200);
    const result = last(readings(newPipeline(), renderSine(flat, 1)));

    assert.ok(result.active);
    assert.equal(result.midi, A3);
    assert.ok(Math.abs(result.cents + 10) < 2, `cents ${result.cents}`);
  });

  it('shows nothing for silence and for noise', () => {
    for (const samples of [renderSilence(1), renderNoise(1)]) {
      assert.ok(readings(newPipeline(), samples).every((item) => !item.active));
    }
  });

  it('ignores a very quiet note unless sensitivity is raised', () => {
    const quiet = renderSine(midiToFrequency(A3), 1, 0.006);

    assert.ok(readings(newPipeline(), quiet).every((item) => !item.active));
    assert.ok(
      last(readings(newPipeline({ sensitivity: 'high' }), quiet)).active,
    );
  });

  it('keeps one note through vibrato', () => {
    const vibrato = renderTone({
      frequencyAt: (time) =>
        midiToFrequency(A3) *
        2 ** ((0.4 * Math.sin(time * 2 * Math.PI * 5.5)) / 12),
      seconds: 1.5,
    });
    const active = readings(newPipeline(), vibrato).filter(
      (item) => item.active,
    );

    assert.ok(active.length > 0);
    assert.equal(
      new Set(active.map((item) => item.active && item.noteId)).size,
      1,
    );
  });

  it('holds the note through a short gap', () => {
    const note = renderSine(midiToFrequency(A3), 0.6);
    const result = last(
      readings(newPipeline(), concatSamples(note, renderSilence(0.15))),
    );

    assert.ok(result.active && result.held);
  });

  it('goes idle after a long gap', () => {
    const note = renderSine(midiToFrequency(A3), 0.6);
    const result = last(
      readings(newPipeline(), concatSamples(note, renderSilence(0.6))),
    );

    assert.equal(result.active, false);
  });

  it('follows an octave jump as a new note', () => {
    const jump = concatSamples(
      renderSine(midiToFrequency(A3), 0.6),
      renderSine(midiToFrequency(A3 + 12), 0.6),
    );
    const result = readings(newPipeline(), jump);
    const final = last(result);

    assert.ok(final.active);
    assert.equal(final.midi, A3 + 12);
    assert.ok(
      new Set(result.map((item) => item.active && item.noteId)).size >= 2,
    );
  });

  it('follows the reference tuning', () => {
    const pipeline = createPitchPipeline({
      estimator: createPitchyEstimator(),
      referenceHz: 432,
    });
    const result = last(
      readings(pipeline, renderSine(midiToFrequency(A3, 432), 1)),
    );

    assert.ok(result.active);
    assert.equal(result.midi, A3);
    assert.ok(Math.abs(result.cents) < 2);
  });
});
