import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getTrackPositionAtRecordingMs } from '@org/audio-library-models';

import { buildRecordingTimeline } from './recording-timeline-builder.ts';

const rate = 1;

describe('buildRecordingTimeline', () => {
  it('extends the first segment back by the latency', () => {
    const timeline = buildRecordingTimeline({
      changes: [{ atMs: 0, trackMs: 30_000, playing: true }],
      rate,
      latencyMs: 100,
      durationMs: 10_000,
    });

    assert.deepEqual(timeline, [
      {
        recordingStartMs: 0,
        recordingEndMs: 10_000,
        trackStartMs: 29_900,
        held: false,
      },
    ]);
  });

  it('scales the first-sample correction by the rate', () => {
    const timeline = buildRecordingTimeline({
      changes: [{ atMs: 0, trackMs: 30_000, playing: true }],
      rate: 0.7,
      latencyMs: 100,
      durationMs: 10_000,
    });

    assert.equal(timeline[0]?.trackStartMs, 29_930);
  });

  it('shifts a pause, resume and seek later by the latency', () => {
    const timeline = buildRecordingTimeline({
      changes: [
        { atMs: 0, trackMs: 10_000, playing: true },
        { atMs: 4000, trackMs: 14_000, playing: false },
        { atMs: 6000, trackMs: 14_000, playing: true },
        { atMs: 8000, trackMs: 90_000, playing: true },
      ],
      rate,
      latencyMs: 50,
      durationMs: 10_000,
    });

    assert.deepEqual(timeline, [
      {
        recordingStartMs: 0,
        recordingEndMs: 4050,
        trackStartMs: 9950,
        held: false,
      },
      {
        recordingStartMs: 4050,
        recordingEndMs: 6050,
        trackStartMs: 14_000,
        held: true,
      },
      {
        recordingStartMs: 6050,
        recordingEndMs: 8050,
        trackStartMs: 14_000,
        held: false,
      },
      {
        recordingStartMs: 8050,
        recordingEndMs: 10_000,
        trackStartMs: 90_000,
        held: false,
      },
    ]);
  });

  it('records loop passes as repeated segments over the same track range', () => {
    const timeline = buildRecordingTimeline({
      changes: [
        { atMs: 0, trackMs: 20_000, playing: true },
        { atMs: 5000, trackMs: 20_000, playing: true },
        { atMs: 10_000, trackMs: 20_000, playing: true },
      ],
      rate,
      latencyMs: 0,
      durationMs: 15_000,
    });

    assert.equal(timeline.length, 3);
    assert.equal(
      getTrackPositionAtRecordingMs(
        { timeline, shaping: { rate, pitchSemitones: 0 } },
        7000,
      ),
      22_000,
    );
  });

  it('drops changes whose shifted time lands after the end', () => {
    const timeline = buildRecordingTimeline({
      changes: [
        { atMs: 0, trackMs: 0, playing: true },
        { atMs: 9990, trackMs: 5000, playing: true },
        { atMs: 20_000, trackMs: 0, playing: true },
      ],
      rate,
      latencyMs: 50,
      durationMs: 10_000,
    });

    assert.deepEqual(timeline, [
      {
        recordingStartMs: 0,
        recordingEndMs: 10_000,
        trackStartMs: 0,
        held: false,
      },
    ]);
  });

  it('does not extend a first segment that starts held', () => {
    const timeline = buildRecordingTimeline({
      changes: [{ atMs: 0, trackMs: 5000, playing: false }],
      rate,
      latencyMs: 100,
      durationMs: 1000,
    });

    assert.deepEqual(timeline, [
      {
        recordingStartMs: 0,
        recordingEndMs: 1000,
        trackStartMs: 5000,
        held: true,
      },
    ]);
  });
});
