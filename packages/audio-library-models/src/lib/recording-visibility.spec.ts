import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  getRecordingOpenContext,
  getRecordingPlacements,
} from './recording-visibility.ts';
import { DEFAULT_PLAYBACK_SHAPING } from './playback-shaping.ts';
import { buildRecording } from './recording-test-fixtures.ts';

const track = { id: 'track-1', driveFileId: 'drive-1', name: 'Song.mp3' };
const adjusted = {
  id: 'adj-1',
  name: 'Song • 0.70×',
  transform: { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.7 },
};
const loop = { id: 'loop-1', name: 'Verse', startMs: 30_000, endMs: 40_000 };
const shaping = { rate: 0.7, pitchSemitones: 0 };

const library = (opts: { adjusted?: boolean; loop?: boolean } = {}) => ({
  sources: [
    { id: 'track-1' },
    ...(opts.adjusted === false ? [] : [{ id: 'adj-1' }]),
  ],
  loops: opts.loop === false ? [] : [{ id: 'loop-1' }],
});

describe('getRecordingPlacements', () => {
  it('lists a track recording in the track main list only', () => {
    const rec = buildRecording({ lineage: { track } });

    assert.deepEqual(getRecordingPlacements(rec, library()), [
      { surface: 'track-main', entityId: 'track-1' },
    ]);
  });

  it('keeps a loop recording out of the track main list', () => {
    const rec = buildRecording({ lineage: { track, loop } });

    assert.deepEqual(getRecordingPlacements(rec, library()), [
      { surface: 'loop', entityId: 'loop-1' },
      { surface: 'track-loops', entityId: 'track-1', loopId: 'loop-1' },
    ]);
  });

  it('lists an adjusted-track recording under the copy and its parent', () => {
    const rec = buildRecording({ lineage: { track, adjusted }, shaping });

    assert.deepEqual(getRecordingPlacements(rec, library()), [
      { surface: 'adjusted-main', entityId: 'adj-1' },
      { surface: 'track-main', entityId: 'track-1' },
    ]);
  });

  it('lists a loop on an adjusted track in the loop, both Loops sections', () => {
    const rec = buildRecording({ lineage: { track, adjusted, loop }, shaping });

    assert.deepEqual(getRecordingPlacements(rec, library()), [
      { surface: 'loop', entityId: 'loop-1' },
      { surface: 'adjusted-loops', entityId: 'adj-1', loopId: 'loop-1' },
      { surface: 'track-loops', entityId: 'track-1', loopId: 'loop-1' },
    ]);
  });

  it('falls back to the parent when the adjusted copy is deleted', () => {
    const rec = buildRecording({ lineage: { track, adjusted }, shaping });

    assert.deepEqual(
      getRecordingPlacements(rec, library({ adjusted: false })),
      [{ surface: 'track-main', entityId: 'track-1' }],
    );
  });

  it('keeps a deleted loop recording under the track Loops section', () => {
    const rec = buildRecording({ lineage: { track, loop } });

    assert.deepEqual(getRecordingPlacements(rec, library({ loop: false })), [
      { surface: 'track-loops', entityId: 'track-1', loopId: 'loop-1' },
    ]);
  });

  it('treats a session adjustment as a track recording', () => {
    const rec = buildRecording({ lineage: { track }, shaping });

    assert.deepEqual(getRecordingPlacements(rec, library()), [
      { surface: 'track-main', entityId: 'track-1' },
    ]);
  });
});

describe('getRecordingOpenContext', () => {
  it('opens a loop recording in its loop, locked to the loop range', () => {
    const rec = buildRecording({ lineage: { track, loop }, shaping });

    assert.deepEqual(getRecordingOpenContext(rec, library()), {
      kind: 'loop',
      sourceId: 'track-1',
      loopId: 'loop-1',
      range: { startMs: 30_000, endMs: 40_000 },
      shaping,
    });
  });

  it('opens an adjusted-track recording on the copy with the whole track', () => {
    const rec = buildRecording({
      lineage: { track, adjusted },
      shaping,
      timeline: [
        {
          recordingStartMs: 0,
          recordingEndMs: 342_000,
          trackStartMs: 0,
          held: false,
        },
      ],
    });
    const context = getRecordingOpenContext(rec, library());

    assert.equal(context?.kind, 'adjusted');
    assert.equal(context?.sourceId, 'adj-1');
    assert.equal(context?.range, null);
  });

  it('limits a segment recording to its recorded range and applies its shaping', () => {
    const rec = buildRecording({ lineage: { track }, shaping });
    const context = getRecordingOpenContext(rec, library());

    assert.equal(context?.kind, 'track');
    assert.deepEqual(context?.range, { startMs: 30_000, endMs: 37_000 });
    assert.deepEqual(context?.shaping, shaping);
  });

  it('falls back to the recorded span when the loop was deleted', () => {
    const rec = buildRecording({ lineage: { track, loop }, shaping });
    const context = getRecordingOpenContext(rec, library({ loop: false }));

    assert.equal(context?.kind, 'track');
    assert.equal(context?.loopId, undefined);
    assert.deepEqual(context?.range, { startMs: 30_000, endMs: 37_000 });
  });

  it('opens on the parent with the stored shaping when the copy was deleted', () => {
    const rec = buildRecording({ lineage: { track, adjusted }, shaping });
    const context = getRecordingOpenContext(rec, library({ adjusted: false }));

    assert.equal(context?.sourceId, 'track-1');
    assert.deepEqual(context?.shaping, shaping);
  });

  it('returns null when the track itself is gone', () => {
    const rec = buildRecording({ lineage: { track } });

    assert.equal(
      getRecordingOpenContext(rec, { sources: [], loops: [] }),
      null,
    );
  });
});
