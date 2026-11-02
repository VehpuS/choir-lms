import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { planMixRender } from './mix-render-plan.ts';

/** 1 kHz output, so one frame is one millisecond. */
const RATE = 1000;
const shaping = { pitchSemitones: 2, rate: 0.5 };

const build = (
  timeline: Array<[number, number, number, boolean?]>,
  overrides: { durationMs?: number; nudgeMs?: number } = {},
) =>
  planMixRender(
    {
      durationMs: overrides.durationMs ?? 4000,
      nudgeMs: overrides.nudgeMs ?? 0,
      shaping,
      timeline: timeline.map(
        ([recordingStartMs, recordingEndMs, trackStartMs, held]) => ({
          held: held ?? false,
          recordingEndMs,
          recordingStartMs,
          trackStartMs,
        }),
      ),
    },
    RATE,
  );

describe('planMixRender', () => {
  it('maps each timeline segment to output frames with the stored rate and pitch', () => {
    const plan = build([[0, 4000, 10_000]]);

    assert.equal(plan.totalFrames, 4000);
    assert.deepEqual(plan.segments, [
      {
        endFrame: 4000,
        kind: 'track',
        pitchSemitones: 2,
        rate: 0.5,
        startFrame: 0,
        trackStartMs: 10_000,
      },
    ]);
  });

  it('plays a loop recording as one track segment per pass at the loop start', () => {
    const plan = build([
      [0, 2000, 5000],
      [2000, 4000, 5000],
    ]);

    assert.deepEqual(
      plan.segments.map((segment) => [
        segment.startFrame,
        segment.kind,
        segment.trackStartMs,
      ]),
      [
        [0, 'track', 5000],
        [2000, 'track', 5000],
      ],
    );
  });

  it('renders silence for a paused stretch and for time no segment covers', () => {
    const plan = build([
      [500, 1500, 0],
      [1500, 2500, 800, true],
    ]);

    assert.deepEqual(
      plan.segments.map((segment) => [
        segment.startFrame,
        segment.endFrame,
        segment.kind,
      ]),
      [
        [0, 500, 'silence'],
        [500, 1500, 'track'],
        [1500, 2500, 'silence'],
        [2500, 4000, 'silence'],
      ],
    );
  });

  it('keeps segments from overlapping and advances the track position for a trimmed start', () => {
    const plan = build([
      [0, 1100, 0],
      [1000, 2000, 4000],
    ]);

    assert.equal(plan.segments[1]?.startFrame, 1100);
    // 100 ms of output skipped, at 0.5 track seconds per second.
    assert.equal(plan.segments[1]?.trackStartMs, 4050);
  });

  it('clips a segment that runs past the recording and ignores unordered input', () => {
    const plan = build(
      [
        [3000, 9000, 100],
        [0, 3000, 0],
      ],
      { durationMs: 4000 },
    );

    assert.equal(plan.segments.at(-1)?.endFrame, 4000);
    assert.equal(plan.segments[0]?.startFrame, 0);
  });

  it('reports the nudge as frames the recording is placed later', () => {
    assert.equal(
      build([[0, 4000, 0]], { nudgeMs: 25 }).recordingOffsetFrames,
      25,
    );
    assert.equal(
      build([[0, 4000, 0]], { nudgeMs: -40 }).recordingOffsetFrames,
      -40,
    );
  });

  it('is the same for the same metadata', () => {
    assert.deepEqual(build([[0, 4000, 10_000]]), build([[0, 4000, 10_000]]));
  });
});
