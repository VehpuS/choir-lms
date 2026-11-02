import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createRecordingPlayableItem,
  isRangeLimitedRecordingItem,
} from './recording-playable.ts';
import type { RecordingOpenContext } from './recording-visibility.ts';
import type { DriveAudioSource, NamedLoop } from './rehearsal-domain.ts';

const recording = {
  id: 'r1',
  name: 'Take 1',
  lineage: { track: { id: 't1', driveFileId: 'd1', name: 'Song' } },
};
const source = {
  id: 't1',
  name: 'Song',
  durationMs: 240_000,
} as unknown as DriveAudioSource;
const loop = {
  id: 'l1',
  name: 'Chorus',
  sourceId: 't1',
  sourceName: 'Song',
  startMs: 10_000,
  endMs: 20_000,
} as NamedLoop;
const shaping = { rate: 1, pitchSemitones: 0 };

const context = (
  overrides: Partial<RecordingOpenContext> = {},
): RecordingOpenContext => ({
  kind: 'track',
  sourceId: 't1',
  range: null,
  shaping,
  ...overrides,
});

describe('createRecordingPlayableItem', () => {
  it('plays a whole-track recording over the whole track', () => {
    const item = createRecordingPlayableItem({
      recording,
      context: context(),
      source,
    });

    assert.equal(item.id, 'recording:r1');
    assert.equal(item.recordingId, 'r1');
    assert.equal(item.kind, 'track');
    assert.equal(item.title, 'Take 1');
    assert.deepEqual(item.range, { startMs: 0, endMs: 240_000 });
    assert.deepEqual(item.transform, {
      pitchSemitones: 0,
      speedMultiplier: 1,
      tempoSource: 'multiplier',
    });
    assert.equal(isRangeLimitedRecordingItem(item), false);
  });

  it('limits a segment recording to the recorded range', () => {
    const item = createRecordingPlayableItem({
      recording,
      context: context({ range: { startMs: 65_000, endMs: 95_000 } }),
      source,
    });

    assert.deepEqual(item.range, { startMs: 65_000, endMs: 95_000 });
    assert.equal(isRangeLimitedRecordingItem(item), true);
  });

  it('plays a loop recording as the loop with the loop range', () => {
    const item = createRecordingPlayableItem({
      recording,
      context: context({
        kind: 'loop',
        loopId: 'l1',
        range: { startMs: 10_000, endMs: 20_000 },
      }),
      source,
      loop,
    });

    assert.equal(item.kind, 'loop');
    assert.equal(item.loopId, 'l1');
    assert.deepEqual(item.range, { startMs: 10_000, endMs: 20_000 });
    assert.equal(item.description, 'Recording · Chorus');
    assert.equal(isRangeLimitedRecordingItem(item), false);
  });

  it('applies the recording’s speed and pitch even when the track has its own', () => {
    const item = createRecordingPlayableItem({
      recording,
      context: context({ shaping: { rate: 0.7, pitchSemitones: 2 } }),
      source: {
        ...source,
        adjustment: {
          transform: {
            pitchSemitones: 5,
            speedMultiplier: 1.2,
            tempoSource: 'multiplier',
          },
        },
      } as unknown as DriveAudioSource,
    });

    assert.deepEqual(item.transform, {
      pitchSemitones: 2,
      speedMultiplier: 0.7,
      tempoSource: 'multiplier',
    });
  });

  it('plays unshaped, over the track’s own adjustment, when the recording was unshaped', () => {
    const item = createRecordingPlayableItem({
      recording,
      context: context(),
      source: {
        ...source,
        adjustment: {
          transform: {
            pitchSemitones: 5,
            speedMultiplier: 1,
            tempoSource: 'multiplier',
          },
        },
      } as unknown as DriveAudioSource,
    });

    assert.deepEqual(item.transform, {
      pitchSemitones: 0,
      speedMultiplier: 1,
      tempoSource: 'multiplier',
    });
  });

  it('is not limited when the range covers the track from the start to its end', () => {
    const item = createRecordingPlayableItem({
      recording,
      context: context({ range: { startMs: 0, endMs: 240_000 } }),
      source,
    });

    assert.equal(isRangeLimitedRecordingItem(item), false);
  });
});
