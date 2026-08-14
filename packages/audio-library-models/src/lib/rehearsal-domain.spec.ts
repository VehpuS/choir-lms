import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  createLoopPlayableItem,
  createTrackPlayableItem,
  resolveNamedLoopParentTrack,
  validateLoopRange,
} from './rehearsal-domain.js';
import {
  addLoopToPlaylist,
  addTrackToPlaylist,
  createPlaylist,
  movePlaylistEntry,
  removePlaylistEntry,
  renamePlaylist,
} from './rehearsal-playlists.js';

const TEST_SOURCE = createDriveAudioSource({
  driveFileId: 'drive-file-123',
  name: 'Soprano Warmup.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 180000,
  availability: { status: 'available' },
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
  it('resolves stable parent-track context from a saved loop', () => {
    assert.deepEqual(
      resolveNamedLoopParentTrack({
        sourceId: TEST_SOURCE.id,
        sourceName: TEST_SOURCE.name,
      }),
      {
        id: TEST_SOURCE.id,
        name: TEST_SOURCE.name,
      },
    );
  });

  it('creates full-track playable items that span the source duration', () => {
    const playableItem = createTrackPlayableItem(
      TEST_SOURCE,
      'playlist-1',
      'entry-1',
    );

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
      playlistEntryId: 'entry-1',
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
        ownerId: 'user-1',
        createdAt: '2026-05-10T00:00:00.000Z',
        updatedAt: '2026-05-10T00:00:00.000Z',
      },
      TEST_SOURCE,
      'playlist-1',
      'entry-2',
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
      playlistEntryId: 'entry-2',
      description: 'Soprano Warmup.mp3 loop',
    });
  });
});

describe('playlist helpers', () => {
  it('creates a trimmed playlist and appends track and loop entries in order', () => {
    const createdPlaylist = createPlaylist({
      name: '  Wednesday rehearsal  ',
      ownerId: 'user-1',
      createdAt: '2026-05-11T00:00:00.000Z',
    });

    const trackPlaylist = addTrackToPlaylist(
      createdPlaylist,
      TEST_SOURCE,
      '2026-05-11T00:01:00.000Z',
    );
    const loopPlaylist = addLoopToPlaylist(
      trackPlaylist,
      {
        id: 'loop-42',
        name: 'Entrance cue',
        sourceId: TEST_SOURCE.id,
        sourceName: TEST_SOURCE.name,
        startMs: 12000,
        endMs: 18500,
        ownerId: 'user-1',
        createdAt: '2026-05-10T00:00:00.000Z',
        updatedAt: '2026-05-10T00:00:00.000Z',
      },
      '2026-05-11T00:02:00.000Z',
    );

    assert.equal(createdPlaylist.name, 'Wednesday rehearsal');
    assert.equal(
      createdPlaylist.id,
      'playlist:user-1:2026-05-11T00:00:00.000Z',
    );
    assert.deepEqual(
      loopPlaylist.items.map((entry) => ({
        description: entry.description,
        kind: entry.kind,
        playlistId: entry.playlistId,
        sortIndex: entry.sortIndex,
        title: entry.title,
      })),
      [
        {
          description: 'Full track',
          kind: 'track',
          playlistId: createdPlaylist.id,
          sortIndex: 0,
          title: 'Soprano Warmup.mp3',
        },
        {
          description: 'Soprano Warmup.mp3 loop',
          kind: 'loop',
          playlistId: createdPlaylist.id,
          sortIndex: 1,
          title: 'Entrance cue',
        },
      ],
    );
    assert.equal(loopPlaylist.updatedAt, '2026-05-11T00:02:00.000Z');
  });

  it('normalizes legacy playlist entries onto the owning playlist relationship', () => {
    const playlist = createPlaylist({
      items: [
        {
          id: 'entry-2',
          kind: 'loop',
          sourceId: TEST_SOURCE.id,
          loopId: 'loop-42',
          title: 'Second',
          description: 'Loop',
          createdAt: '2026-05-11T00:02:00.000Z',
          sortIndex: 4,
        },
        {
          id: 'entry-1',
          kind: 'track',
          sourceId: TEST_SOURCE.id,
          title: 'First',
          description: 'Full track',
          createdAt: '2026-05-11T00:01:00.000Z',
          sortIndex: 2,
        },
      ],
      name: 'Morning run',
      ownerId: 'user-1',
      createdAt: '2026-05-11T00:00:00.000Z',
    });

    assert.deepEqual(
      playlist.items.map((entry) => ({
        id: entry.id,
        playlistId: entry.playlistId,
        sortIndex: entry.sortIndex,
      })),
      [
        { id: 'entry-1', playlistId: playlist.id, sortIndex: 0 },
        { id: 'entry-2', playlistId: playlist.id, sortIndex: 1 },
      ],
    );
  });

  it('renames, reorders, and removes playlist entries while updating timestamps', () => {
    const createdPlaylist = createPlaylist({
      items: [
        {
          id: 'entry-1',
          kind: 'track',
          sourceId: TEST_SOURCE.id,
          title: 'First',
          description: 'Full track',
          createdAt: '2026-05-11T00:01:00.000Z',
        },
        {
          id: 'entry-2',
          kind: 'loop',
          sourceId: TEST_SOURCE.id,
          loopId: 'loop-42',
          title: 'Second',
          description: 'Loop',
          createdAt: '2026-05-11T00:02:00.000Z',
        },
      ],
      name: 'Morning run',
      ownerId: 'user-1',
      createdAt: '2026-05-11T00:00:00.000Z',
    });

    const renamedPlaylist = renamePlaylist(
      createdPlaylist,
      '  Evening rehearsal ',
      '2026-05-11T00:03:00.000Z',
    );
    const movedPlaylist = movePlaylistEntry(
      renamedPlaylist,
      1,
      0,
      '2026-05-11T00:04:00.000Z',
    );
    const trimmedPlaylist = removePlaylistEntry(
      movedPlaylist,
      'entry-1',
      '2026-05-11T00:05:00.000Z',
    );

    assert.equal(renamedPlaylist.name, 'Evening rehearsal');
    assert.deepEqual(
      movedPlaylist.items.map((entry) => ({
        id: entry.id,
        sortIndex: entry.sortIndex,
      })),
      [
        { id: 'entry-2', sortIndex: 0 },
        { id: 'entry-1', sortIndex: 1 },
      ],
    );
    assert.deepEqual(
      trimmedPlaylist.items.map((entry) => ({
        id: entry.id,
        playlistId: entry.playlistId,
        sortIndex: entry.sortIndex,
      })),
      [{ id: 'entry-2', playlistId: trimmedPlaylist.id, sortIndex: 0 }],
    );
    assert.equal(trimmedPlaylist.updatedAt, '2026-05-11T00:05:00.000Z');
  });
});
