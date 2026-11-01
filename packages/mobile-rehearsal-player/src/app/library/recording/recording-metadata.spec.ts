import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PLAYBACK_SHAPING,
  createAdjustedTrackSource,
  type DriveAudioSource,
  type NamedLoop,
  type TrackMarker,
} from '@org/audio-library-models';

import {
  captureRecordingStart,
  completeRecording,
  type RecordingStartInput,
} from './recording-metadata.js';

const NOW = '2026-02-01T10:00:00.000Z';

const track: DriveAudioSource = {
  id: 'track-1',
  provider: 'google-drive',
  driveFileId: 'drive-1',
  name: 'Song.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 240_000,
  modifiedTime: '2026-01-01T00:00:00.000Z',
  createdAt: NOW,
  availability: { status: 'available' } as DriveAudioSource['availability'],
};

const loop: NamedLoop = {
  id: 'loop-1',
  name: 'Verse',
  sourceId: 'track-1',
  sourceName: 'Song.mp3',
  startMs: 30_000,
  endMs: 40_000,
  ownerId: 'user',
  createdAt: NOW,
  updatedAt: NOW,
};

const marker = (name: string, positionMs: number): TrackMarker => ({
  id: name,
  name,
  positionMs,
  createdAt: NOW,
});

const input = (
  overrides: Partial<RecordingStartInput> = {},
): RecordingStartInput => ({
  id: 'rec-1',
  createdAt: NOW,
  playing: track,
  parent: track,
  shaping: DEFAULT_PLAYBACK_SHAPING,
  markers: [],
  existingNames: [],
  appliedLatencyMs: 40,
  ...overrides,
});

const outcome = (trackStartMs: number, durationMs = 10_000) => ({
  durationMs,
  sampleRate: 44100,
  sizeBytes: 882_000,
  timeline: [
    {
      recordingStartMs: 0,
      recordingEndMs: durationMs,
      trackStartMs,
      held: false,
    },
  ],
});

describe('captureRecordingStart', () => {
  it('names the recording and records the file, version, and shaping it was sung against', () => {
    const draft = captureRecordingStart(
      input({
        existingNames: ['Recording 1'],
        shaping: {
          ...DEFAULT_PLAYBACK_SHAPING,
          speedMultiplier: 0.7,
          pitchSemitones: 2,
        },
      }),
    );

    assert.equal(draft.name, 'Recording 2');
    assert.deepEqual(draft.source, {
      driveFileId: 'drive-1',
      name: 'Song.mp3',
      contentVersion: '2026-01-01T00:00:00.000Z',
      durationMs: 240_000,
    });
    assert.deepEqual(draft.shaping, { rate: 0.7, pitchSemitones: 2 });
    assert.equal(draft.appliedLatencyMs, 40);
    assert.equal(draft.nudgeMs, 0);
  });

  it('stores the loop and the adjusted copy with their values', () => {
    const adjusted = createAdjustedTrackSource({
      source: track,
      transform: { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.8 },
      createdAt: NOW,
    });
    const draft = captureRecordingStart(input({ playing: adjusted, loop }));

    assert.equal(draft.lineage.track.id, 'track-1');
    assert.equal(draft.lineage.adjusted?.id, adjusted.id);
    assert.equal(draft.lineage.adjusted?.transform.speedMultiplier, 0.8);
    assert.deepEqual(draft.lineage.loop, {
      id: 'loop-1',
      name: 'Verse',
      startMs: 30_000,
      endMs: 40_000,
    });
  });

  it('rejects an adjusted copy as the parent', () => {
    const adjusted = createAdjustedTrackSource({
      source: track,
      transform: { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.8 },
      createdAt: NOW,
    });

    assert.throws(() => captureRecordingStart(input({ parent: adjusted })));
  });

  it('is unaffected by later changes to the track, loop, or markers it copied', () => {
    const mutableMarkers = [marker('Verse 2', 31_000)];
    const mutableLoop = { ...loop };
    const mutableTrack = { ...track };
    const draft = captureRecordingStart(
      input({
        parent: mutableTrack,
        playing: mutableTrack,
        loop: mutableLoop,
        markers: mutableMarkers,
      }),
    );

    mutableTrack.name = 'Renamed.mp3';
    mutableTrack.modifiedTime = '2027-01-01T00:00:00.000Z';
    mutableLoop.name = 'Deleted';
    mutableMarkers[0] = marker('Verse 2', 99_000);

    assert.equal(draft.lineage.track.name, 'Song.mp3');
    assert.equal(draft.source.contentVersion, '2026-01-01T00:00:00.000Z');
    assert.equal(draft.lineage.loop?.name, 'Verse');
    assert.equal(draft.markerSnapshot[0]?.positionMs, 31_000);
  });

  it('copies no track audio: only the file reference, never bytes', () => {
    const keys = Object.keys(captureRecordingStart(input()));

    assert.deepEqual(
      keys.filter((key) => /audio|bytes|blob|samples|buffer/i.test(key)),
      [],
    );
  });
});

describe('completeRecording', () => {
  it('keeps only the markers inside the recorded span, in order', () => {
    const draft = captureRecordingStart(
      input({
        markers: [
          marker('Chorus', 50_000),
          marker('Intro', 1000),
          marker('Verse 2', 32_000),
          marker('Bridge', 35_000),
        ],
      }),
    );
    const recording = completeRecording(draft, outcome(30_000));

    assert.deepEqual(
      recording.markers.map((m) => m.name),
      ['Verse 2', 'Bridge'],
    );
    assert.equal(recording.durationMs, 10_000);
    assert.equal('markerSnapshot' in recording, false);
  });

  it('stores no markers when the timeline never advanced', () => {
    const draft = captureRecordingStart(input({ markers: [marker('A', 0)] }));
    const recording = completeRecording(draft, {
      ...outcome(0),
      timeline: [
        {
          recordingStartMs: 0,
          recordingEndMs: 10_000,
          trackStartMs: 0,
          held: true,
        },
      ],
    });

    assert.deepEqual(recording.markers, []);
  });
});
