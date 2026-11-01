import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PLAYBACK_SHAPING,
  createAdjustedTrackSource,
  createLoopPlayableItem,
  createTrackPlayableItem,
  type DriveAudioSource,
  type NamedLoop,
} from '@org/audio-library-models';

import {
  buildRecordingStartRequest,
  getRecordingOwnerForItem,
  resolveParentSource,
} from './recording-start-request.js';

const track = {
  id: 'track-1',
  provider: 'google-drive',
  driveFileId: 'drive-1',
  name: 'Song.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 60_000,
  modifiedTime: 'v1',
  createdAt: 'x',
  availability: { status: 'available' },
} as DriveAudioSource;

const adjusted = createAdjustedTrackSource({
  source: track,
  transform: { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.8 },
  createdAt: 'x',
});

const loop: NamedLoop = {
  id: 'loop-1',
  name: 'Verse',
  sourceId: 'track-1',
  sourceName: 'Song.mp3',
  startMs: 10_000,
  endMs: 20_000,
  ownerId: 'u',
  createdAt: 'x',
  updatedAt: 'x',
};

const base = {
  positionMs: 12_000,
  markers: [{ name: 'Verse 2', positionMs: 11_000 }],
  shaping: { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.7 },
  existingNames: ['Recording 1'],
  id: 'rec-9',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('buildRecordingStartRequest', () => {
  it('builds a track recording with the pressed position, shaping, and next default name', () => {
    const request = buildRecordingStartRequest({
      ...base,
      item: createTrackPlayableItem(track),
    });

    assert.equal(request.draft.id, 'rec-9');
    assert.equal(request.draft.name, 'Recording 2');
    assert.deepEqual(request.draft.shaping, { rate: 0.7, pitchSemitones: 0 });
    assert.equal(request.draft.lineage.loop, undefined);
    assert.deepEqual(request.getTimeline(5000), [
      {
        recordingStartMs: 0,
        recordingEndMs: 5000,
        trackStartMs: 12_000,
        held: false,
      },
    ]);
  });

  it('makes a loop recording when a loop is playing', () => {
    const request = buildRecordingStartRequest({
      ...base,
      item: createLoopPlayableItem(loop, track),
    });

    assert.equal(request.draft.lineage.loop?.id, 'loop-1');
    assert.equal(request.draft.lineage.loop?.startMs, 10_000);
    assert.equal(request.draft.lineage.loop?.endMs, 20_000);
  });

  it('records an adjusted copy under its parent track', () => {
    const request = buildRecordingStartRequest({
      ...base,
      item: createTrackPlayableItem(adjusted),
    });

    assert.equal(request.draft.lineage.track.id, 'track-1');
    assert.equal(request.draft.lineage.adjusted?.id, adjusted.id);
    assert.equal(request.draft.source.driveFileId, 'drive-1');
  });
});

describe('resolveParentSource', () => {
  it('leaves a saved track alone and turns an adjusted copy into its source', () => {
    assert.equal(resolveParentSource(track), track);

    const parent = resolveParentSource(adjusted);

    assert.equal(parent.id, 'track-1');
    assert.equal(parent.name, 'Song.mp3');
    assert.equal(parent.adjustment, undefined);
    assert.equal(parent.driveFileId, adjusted.driveFileId);
  });
});

describe('getRecordingOwnerForItem', () => {
  it('prefers the loop, then the adjusted copy, then the track', () => {
    assert.deepEqual(
      getRecordingOwnerForItem(createLoopPlayableItem(loop, track)),
      {
        kind: 'loop',
        id: 'loop-1',
      },
    );
    assert.deepEqual(
      getRecordingOwnerForItem(createTrackPlayableItem(adjusted)),
      {
        kind: 'adjusted',
        id: adjusted.id,
      },
    );
    assert.deepEqual(getRecordingOwnerForItem(createTrackPlayableItem(track)), {
      kind: 'track',
      id: 'track-1',
    });
  });
});
