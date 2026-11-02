import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderMix } from './mix-renderer.ts';
import { createReader } from './mix-render-test-fakes.ts';
import {
  createSoundTouchStretcher,
  type DecodedTrack,
} from './soundtouch-track-stretcher.ts';

const SAMPLE_RATE = 44_100;
const LOW_HZ = 440;
const HIGH_HZ = 880;
const HALF_SECOND_FRAMES = SAMPLE_RATE / 2;

/** 0.5 s of 440 Hz then 0.5 s of 880 Hz, so the position is audible as pitch. */
const buildTrack = (channelCount = 1): DecodedTrack => {
  const samples = new Float32Array(SAMPLE_RATE);

  samples.forEach((_, index) => {
    const hertz = index < HALF_SECOND_FRAMES ? LOW_HZ : HIGH_HZ;

    samples[index] =
      0.5 * Math.sin((2 * Math.PI * hertz * index) / SAMPLE_RATE);
  });

  return {
    channels: Array.from({ length: channelCount }, () => samples),
    sampleRate: SAMPLE_RATE,
  };
};

/** Frequency of a signal, from its zero crossings. */
const estimateHertz = (samples: Float32Array): number => {
  let crossings = 0;

  for (let index = 1; index < samples.length; index += 1) {
    if ((samples[index - 1] ?? 0) < 0 !== (samples[index] ?? 0) < 0) {
      crossings += 1;
    }
  }

  return (crossings / 2) * (SAMPLE_RATE / samples.length);
};

const read = async (
  request: { trackStartMs: number; rate: number; pitchSemitones: number },
  frames: number,
  track = buildTrack(),
) => {
  const stream = await createSoundTouchStretcher(track).open(request);
  const channels = await stream.read(frames);

  stream.close();

  return channels;
};

/** The middle of a block, away from the pipeline's start-up. */
const middle = (
  samples: Float32Array | undefined,
  from: number,
  count: number,
) => samples?.subarray(from, from + count) ?? new Float32Array(0);

describe('createSoundTouchStretcher', () => {
  it('reports the track layout: mono stays mono, stereo stays stereo', () => {
    assert.equal(createSoundTouchStretcher(buildTrack(1)).channels, 1);
    assert.equal(createSoundTouchStretcher(buildTrack(2)).channels, 2);
    assert.equal(
      createSoundTouchStretcher(buildTrack(2)).sampleRate,
      SAMPLE_RATE,
    );
  });

  it('plays the track unchanged at rate 1 and no pitch shift', async () => {
    const [channel] = await read(
      { pitchSemitones: 0, rate: 1, trackStartMs: 0 },
      HALF_SECOND_FRAMES,
    );

    assert.ok(
      Math.abs(estimateHertz(middle(channel, 4000, 10_000)) - LOW_HZ) < 10,
    );
  });

  it('starts at the requested track position', async () => {
    const [channel] = await read(
      { pitchSemitones: 0, rate: 1, trackStartMs: 600 },
      HALF_SECOND_FRAMES,
    );

    assert.ok(
      Math.abs(estimateHertz(middle(channel, 4000, 10_000)) - HIGH_HZ) < 15,
    );
  });

  it('shifts the pitch by the stored semitones without changing the position', async () => {
    const [channel] = await read(
      { pitchSemitones: 12, rate: 1, trackStartMs: 0 },
      HALF_SECOND_FRAMES,
    );

    assert.ok(
      Math.abs(estimateHertz(middle(channel, 4000, 10_000)) - HIGH_HZ) < 20,
    );
  });

  it('plays slower without changing the pitch: the high half arrives later', async () => {
    const [channel] = await read(
      { pitchSemitones: 0, rate: 0.5, trackStartMs: 0 },
      SAMPLE_RATE * 2,
    );
    const firstSecond = middle(channel, 5000, 30_000);
    const lastSecond = middle(channel, SAMPLE_RATE + 15_000, 20_000);

    // 0.5 s of 440 Hz now lasts about a second; pitch is kept.
    assert.ok(Math.abs(estimateHertz(firstSecond) - LOW_HZ) < 15);
    assert.ok(Math.abs(estimateHertz(lastSecond) - HIGH_HZ) < 25);
  });

  it('returns exactly the frames asked for, silent past the end of the track', async () => {
    const [channel] = await read(
      { pitchSemitones: 0, rate: 1, trackStartMs: 900 },
      SAMPLE_RATE,
    );

    assert.equal(channel?.length, SAMPLE_RATE);
    assert.ok(
      middle(channel, SAMPLE_RATE - 5000, 5000).every(
        (value) => Math.abs(value) < 1e-3,
      ),
    );
  });

  it('gives the same samples on every run and when read in different block sizes', async () => {
    const request = { pitchSemitones: -2, rate: 1.3, trackStartMs: 100 };
    const whole = await read(request, 20_000);
    const again = await read(request, 20_000);
    const stream = await createSoundTouchStretcher(buildTrack()).open(request);
    const parts = [
      ...((await stream.read(7000))[0] ?? []),
      ...((await stream.read(13_000))[0] ?? []),
    ];

    assert.deepEqual(again[0], whole[0]);
    assert.deepEqual(Float32Array.from(parts), whole[0]);
  });

  it('feeds renderMix: a shaped mix is repeatable and carries the track', async () => {
    const render = async () => {
      const chunks: Int16Array[] = [];
      const result = await renderMix({
        balance: 0,
        chunkFrames: 10_000,
        reader: createReader(1, () => 0, SAMPLE_RATE),
        recording: {
          durationMs: 1000,
          nudgeMs: 0,
          shaping: { pitchSemitones: 3, rate: 0.8 },
          timeline: [
            {
              held: false,
              recordingEndMs: 1000,
              recordingStartMs: 0,
              trackStartMs: 0,
            },
          ],
        },
        stretcher: createSoundTouchStretcher(buildTrack()),
        write: (samples) => {
          chunks.push(samples);
        },
      });

      return { chunks, result };
    };

    const first = await render();
    const second = await render();

    assert.equal(first.result.status, 'done');
    assert.deepEqual(second.chunks, first.chunks);
    assert.ok(
      first.chunks.some((chunk) =>
        chunk.some((sample) => Math.abs(sample) > 1000),
      ),
    );
  });
});
