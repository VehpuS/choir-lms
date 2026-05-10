import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  createLoopPlayableItem,
  createTrackPlayableItem,
  validateLoopRange,
} from './rehearsal-domain.js';

const TEST_SOURCE = createDriveAudioSource({
  driveFileId: 'drive-file-123',
  name: 'Soprano Warmup.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 180000,
  availability: {
    status: 'available',
  },
});

describe('validateLoopRange', () => {
  it('normalizes bounds against zero and track duration', () => {
    const result = validateLoopRange(-500, 250000, 180000);

    assert.deepEqual(result, {
      isValid: true,
      normalizedStartMs: 0,
      normalizedEndMs: 180000,
    });
  });

  it('rejects non-finite loop markers', () => {
    const result = validateLoopRange(Number.NaN, 12000);

    assert.equal(result.isValid, false);
    assert.equal(result.error, 'Loop markers must be finite numbers.');
    assert.equal(Number.isNaN(result.normalizedStartMs), true);
    assert.equal(result.normalizedEndMs, 12000);
  });

  it('rejects loops whose end is not after the start', () => {
    const result = validateLoopRange(4000, 4000, 12000);

    assert.deepEqual(result, {
      isValid: false,
      error: 'Loop end must be after the loop start.',
      normalizedStartMs: 4000,
      normalizedEndMs: 4000,
    });
  });
});

describe('playable item factories', () => {
  it('creates full-track playable items that span the source duration', () => {
    const playableItem = createTrackPlayableItem(TEST_SOURCE, 'playlist-1');

    assert.deepEqual(playableItem, {
      id: 'track:drive:drive-file-123',
      kind: 'track',
      title: 'Soprano Warmup.mp3',
      sourceId: 'drive:drive-file-123',
      source: TEST_SOURCE,
      range: {
        startMs: 0,
        endMs: 180000,
      },
      playlistId: 'playlist-1',
      description: 'Full track',
    });
  });

  it('creates saved-loop playable items from loop markers', () => {
    const playableItem = createLoopPlayableItem(
      {
        id: 'loop-42',
        name: 'Entrance cue',
        sourceId: TEST_SOURCE.id,
        sourceName: TEST_SOURCE.name,
        startMs: 12000,
        endMs: 18500,
        ownershipScope: 'user',
        ownerId: 'user-1',
        createdAt: '2026-05-10T00:00:00.000Z',
        updatedAt: '2026-05-10T00:00:00.000Z',
      },
      TEST_SOURCE,
      'playlist-1',
    );

    assert.deepEqual(playableItem, {
      id: 'loop:loop-42',
      kind: 'loop',
      title: 'Entrance cue',
      sourceId: 'drive:drive-file-123',
      source: TEST_SOURCE,
      range: {
        startMs: 12000,
        endMs: 18500,
      },
      loopId: 'loop-42',
      playlistId: 'playlist-1',
      description: 'Soprano Warmup.mp3 loop',
    });
  });
});
