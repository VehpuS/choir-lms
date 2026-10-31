import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getRecordedTrackRange,
  getRecordingTimesAtTrackPosition,
  getTrackPositionAtRecordingMs,
  isWholeTrackRecording,
} from './recording-timeline.ts';
import { buildRecording } from './recording-test-fixtures.ts';

describe('timeline lookups', () => {
  it('maps recording time to track position and back for a plain recording', () => {
    const recording = buildRecording();

    assert.equal(getTrackPositionAtRecordingMs(recording, 2000), 32_000);
    assert.deepEqual(
      getRecordingTimesAtTrackPosition(recording, 32_000),
      [2000],
    );
    assert.equal(getTrackPositionAtRecordingMs(recording, 10_000), null);
    assert.deepEqual(getRecordingTimesAtTrackPosition(recording, 29_999), []);
  });

  it('advances track time by the rate when the track was slowed', () => {
    const recording = buildRecording({
      shaping: { rate: 0.7, pitchSemitones: 2 },
    });

    // Ten recorded seconds covered seven seconds of track.
    assert.equal(
      getTrackPositionAtRecordingMs(recording, 10_000 - 1),
      30_000 + 9999 * 0.7,
    );
    assert.deepEqual(getRecordedTrackRange(recording), {
      startMs: 30_000,
      endMs: 37_000,
    });
    assert.deepEqual(
      getRecordingTimesAtTrackPosition(recording, 33_500),
      [5000],
    );
  });

  it('holds the track position through a pause and skips it going back', () => {
    const recording = buildRecording({
      timeline: [
        {
          recordingStartMs: 0,
          recordingEndMs: 4000,
          trackStartMs: 10_000,
          held: false,
        },
        {
          recordingStartMs: 4000,
          recordingEndMs: 6000,
          trackStartMs: 14_000,
          held: true,
        },
        {
          recordingStartMs: 6000,
          recordingEndMs: 10_000,
          trackStartMs: 14_000,
          held: false,
        },
      ],
    });

    assert.equal(getTrackPositionAtRecordingMs(recording, 5000), 14_000);
    // The resumed stretch owns the position, not the paused one.
    assert.deepEqual(
      getRecordingTimesAtTrackPosition(recording, 14_000),
      [6000],
    );
    assert.deepEqual(getRecordedTrackRange(recording), {
      startMs: 10_000,
      endMs: 18_000,
    });
  });

  it('follows a seek to a new track position', () => {
    const recording = buildRecording({
      timeline: [
        {
          recordingStartMs: 0,
          recordingEndMs: 3000,
          trackStartMs: 0,
          held: false,
        },
        {
          recordingStartMs: 3000,
          recordingEndMs: 6000,
          trackStartMs: 90_000,
          held: false,
        },
      ],
    });

    assert.equal(getTrackPositionAtRecordingMs(recording, 4000), 91_000);
    assert.deepEqual(
      getRecordingTimesAtTrackPosition(recording, 91_000),
      [4000],
    );
  });

  it('returns one recording time per loop pass', () => {
    const pass = (n: number) => ({
      recordingStartMs: n * 5000,
      recordingEndMs: (n + 1) * 5000,
      trackStartMs: 20_000,
      held: false,
    });
    const recording = buildRecording({ timeline: [pass(0), pass(1), pass(2)] });

    assert.deepEqual(
      getRecordingTimesAtTrackPosition(recording, 22_000),
      [2000, 7000, 12_000],
    );
  });
});

describe('isWholeTrackRecording', () => {
  it('is true only near both edges of a known-length track', () => {
    const whole = buildRecording({
      timeline: [
        {
          recordingStartMs: 0,
          recordingEndMs: 240_000,
          trackStartMs: 500,
          held: false,
        },
      ],
    });

    assert.equal(isWholeTrackRecording(whole), true);
    assert.equal(isWholeTrackRecording(buildRecording()), false);
  });

  it('is false when the track length is unknown or nothing advanced', () => {
    assert.equal(
      isWholeTrackRecording(
        buildRecording({ source: { driveFileId: 'd', name: 'x' } }),
      ),
      false,
    );
    assert.equal(getRecordedTrackRange(buildRecording({ timeline: [] })), null);
  });
});
