import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource, NamedLoop } from '@org/audio-library-models';

import { buildRecordingFixture } from './recording-fixtures.js';
import {
  RECORDING_TRACK_UNAVAILABLE,
  resolveRecordingPlayback,
} from './recording-playback-item.js';

const track = {
  id: 'track-1',
  name: 'Song',
  durationMs: 240_000,
} as unknown as DriveAudioSource;
const loop = {
  id: 'loop-1',
  name: 'Chorus',
  sourceId: 'track-1',
  sourceName: 'Song',
  startMs: 1000,
  endMs: 9000,
} as NamedLoop;

describe('resolveRecordingPlayback', () => {
  it('plays a segment recording as its track limited to the recorded range', () => {
    const result = resolveRecordingPlayback(buildRecordingFixture(), {
      sources: [track],
      loops: [],
    });

    assert.equal(result.kind, 'item');
    assert.ok(result.kind === 'item');
    assert.equal(result.item.recordingId, 'rec-1');
    assert.deepEqual(result.item.range, { startMs: 38_000, endMs: 80_000 });
  });

  it('plays a loop recording as its loop', () => {
    const result = resolveRecordingPlayback(
      buildRecordingFixture({
        lineage: {
          track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song' },
          loop: { id: 'loop-1', name: 'Chorus', startMs: 1000, endMs: 9000 },
        },
      }),
      { sources: [track], loops: [loop] },
    );

    assert.ok(result.kind === 'item');
    assert.equal(result.item.kind, 'loop');
    assert.equal(result.item.loopId, 'loop-1');
  });

  it('applies the shaping the recording was made against', () => {
    const result = resolveRecordingPlayback(
      buildRecordingFixture({ shaping: { rate: 0.7, pitchSemitones: 2 } }),
      { sources: [track], loops: [] },
    );

    assert.ok(result.kind === 'item');
    assert.equal(result.item.transform?.speedMultiplier, 0.7);
    assert.equal(result.item.transform?.pitchSemitones, 2);
  });

  it('is unavailable once the track has left the library', () => {
    assert.deepEqual(
      resolveRecordingPlayback(buildRecordingFixture(), {
        sources: [],
        loops: [],
      }),
      { kind: 'unavailable', message: RECORDING_TRACK_UNAVAILABLE },
    );
  });
});
