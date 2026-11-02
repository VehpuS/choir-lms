import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MIX_ENGINE_VERSION } from './engine-version.ts';
import {
  renderMix,
  type RenderMixOptions,
  type TrackStretcher,
} from './mix-renderer.ts';
import {
  createReader,
  createStretcher,
  OUTPUT_RATE,
} from './mix-render-test-fakes.ts';

const INT16_MAX = 32_767;

const toInt16 = (value: number) => Math.round(value * INT16_MAX);

const baseRecording = {
  durationMs: 2000,
  nudgeMs: 0,
  shaping: { pitchSemitones: 0, rate: 1 },
  timeline: [
    {
      held: false,
      recordingEndMs: 2000,
      recordingStartMs: 0,
      trackStartMs: 0,
    },
  ],
};

const render = async (
  overrides: Partial<RenderMixOptions> & { stretcher: TrackStretcher },
) => {
  const chunks: Int16Array[] = [];
  const result = await renderMix({
    balance: 50,
    reader: createReader(2000, () => 0),
    recording: baseRecording,
    write: (samples) => {
      chunks.push(samples);
    },
    ...overrides,
  });
  const samples = new Int16Array(chunks.reduce((sum, c) => sum + c.length, 0));
  let offset = 0;

  for (const chunk of chunks) {
    samples.set(chunk, offset);
    offset += chunk.length;
  }

  return { result, samples };
};

describe('renderMix', () => {
  it('adds the recording to the track at full level at the centre balance and stamps the engine version', async () => {
    const { stretcher } = createStretcher({ constant: 0.5 });
    const { result, samples } = await render({
      reader: createReader(2000, () => 0.25),
      stretcher,
    });

    assert.deepEqual(result, {
      channels: 1,
      engineVersion: MIX_ENGINE_VERSION,
      frames: 2000,
      sampleRate: OUTPUT_RATE,
      status: 'done',
    });
    assert.equal(samples.length, 2000);
    assert.equal(samples[100], toInt16(0.75));
  });

  it('follows the balance: all track at 0, all recording at 100', async () => {
    const reader = createReader(2000, () => 0.25);
    const trackOnly = await render({
      balance: 0,
      reader,
      stretcher: createStretcher({ constant: 0.5 }).stretcher,
    });
    const recordingOnly = await render({
      balance: 100,
      reader,
      stretcher: createStretcher({ constant: 0.5 }).stretcher,
    });

    assert.equal(trackOnly.samples[10], toInt16(0.5));
    assert.equal(recordingOnly.samples[10], toInt16(0.25));
  });

  it('applies the recording level to the recording alone', async () => {
    const { stretcher } = createStretcher({ constant: 0.25 });
    const { samples } = await render({
      levelGain: 2,
      reader: createReader(2000, () => 0.25),
      stretcher,
    });

    assert.equal(samples[10], toInt16(0.75));
  });

  it('opens the track at the stored rate, pitch and position, and renders silence while it was held', async () => {
    const { closed, opened, stretcher } = createStretcher({ constant: 0.5 });
    const { samples } = await render({
      balance: 0,
      recording: {
        ...baseRecording,
        shaping: { pitchSemitones: -3, rate: 0.7 },
        timeline: [
          {
            held: false,
            recordingEndMs: 1000,
            recordingStartMs: 0,
            trackStartMs: 4000,
          },
          {
            held: true,
            recordingEndMs: 1500,
            recordingStartMs: 1000,
            trackStartMs: 5000,
          },
          {
            held: false,
            recordingEndMs: 2000,
            recordingStartMs: 1500,
            trackStartMs: 2000,
          },
        ],
      },
      stretcher,
    });

    assert.deepEqual(opened, [
      { pitchSemitones: -3, rate: 0.7, trackStartMs: 4000 },
      { pitchSemitones: -3, rate: 0.7, trackStartMs: 2000 },
    ]);
    assert.equal(closed(), 2);
    assert.equal(samples[500], toInt16(0.5));
    assert.equal(samples[1200], 0);
    assert.equal(samples[1800], toInt16(0.5));
  });

  it('places the recording later by a positive nudge', async () => {
    const { stretcher } = createStretcher({ constant: 0 });
    const { samples } = await render({
      balance: 100,
      reader: createReader(2000, (index) => (index === 0 ? 0.5 : 0)),
      recording: { ...baseRecording, nudgeMs: 25 },
      stretcher,
    });

    assert.equal(samples[0], 0);
    assert.equal(samples[25], toInt16(0.5));
  });

  it('resamples a recording at another rate to the track rate', async () => {
    const { stretcher } = createStretcher({ constant: 0 });
    const { samples } = await render({
      balance: 100,
      // A 500 Hz recording ramping 0, 1, 2, ... per sample: output frame f is sample f/2.
      reader: createReader(1000, (index) => index / 1000, 500),
      stretcher,
    });

    assert.equal(samples[0], 0);
    assert.equal(samples[2], toInt16(0.001));
    assert.equal(samples[3], toInt16(0.0015));
  });

  it('puts the recording on every channel of a stereo track', async () => {
    const { stretcher } = createStretcher({ channels: 2, constant: 0.1 });
    const { result, samples } = await render({
      reader: createReader(2000, () => 0.2),
      stretcher,
    });

    assert.equal(result.status === 'done' && result.channels, 2);
    assert.equal(samples.length, 4000);
    assert.equal(samples[10], toInt16(0.3));
    assert.equal(samples[11], toInt16(0.3));
  });

  it('gives identical samples on every run, for any chunk size, whatever the live session was doing', async () => {
    const reader = createReader(2000, (i) => 0.4 * Math.sin(i / 7));
    const recording = {
      ...baseRecording,
      nudgeMs: -13,
      shaping: { pitchSemitones: 2, rate: 1.3 },
      timeline: [
        {
          held: false,
          recordingEndMs: 700,
          recordingStartMs: 0,
          trackStartMs: 100,
        },
        {
          held: true,
          recordingEndMs: 900,
          recordingStartMs: 700,
          trackStartMs: 900,
        },
        {
          held: false,
          recordingEndMs: 2000,
          recordingStartMs: 900,
          trackStartMs: 100,
        },
      ],
    };
    const run = (chunkFrames: number, sessionRate: number) =>
      render({
        chunkFrames,
        reader,
        recording,
        // The session's speed must not reach the render.
        stretcher: createStretcher({ sessionRate }).stretcher,
      });

    const first = await run(512, 1);
    const again = await run(512, 1);
    const otherChunks = await run(333, 1);
    const otherSession = await run(512, 0.5);

    assert.ok(first.samples.some((sample) => sample !== 0));
    assert.deepEqual(again.samples, first.samples);
    assert.deepEqual(otherChunks.samples, first.samples);
    assert.deepEqual(otherSession.samples, first.samples);
  });

  it('reports progress per chunk', async () => {
    const progress: Array<[number, number]> = [];

    await render({
      chunkFrames: 800,
      onProgress: (done, total) => progress.push([done, total]),
      stretcher: createStretcher({ constant: 0 }).stretcher,
    });

    assert.deepEqual(progress, [
      [800, 2000],
      [1600, 2000],
      [2000, 2000],
    ]);
  });

  it('stops without writing more when aborted, and closes the open track', async () => {
    const controller = new AbortController();
    const { closed, stretcher } = createStretcher({ constant: 0.1 });
    let writes = 0;
    const { result } = await render({
      chunkFrames: 500,
      signal: controller.signal,
      stretcher,
      write: () => {
        writes += 1;

        if (writes === 2) controller.abort();
      },
    });

    assert.deepEqual(result, { status: 'aborted' });
    assert.equal(writes, 2);
    assert.equal(closed(), 1);
  });

  it('fails, keeping what was written, when the track cannot be read', async () => {
    const { result, samples } = await render({
      chunkFrames: 500,
      recording: {
        ...baseRecording,
        timeline: [
          {
            held: false,
            recordingEndMs: 1000,
            recordingStartMs: 0,
            trackStartMs: 0,
          },
          {
            held: false,
            recordingEndMs: 2000,
            recordingStartMs: 1000,
            trackStartMs: 0,
          },
        ],
      },
      stretcher: createStretcher({ constant: 0.1, failAfterOpens: 1 })
        .stretcher,
    });

    assert.equal(result.status, 'failed');
    assert.equal(samples.length, 1000);
  });
});
