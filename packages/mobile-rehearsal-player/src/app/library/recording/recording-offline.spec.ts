import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_PLAYBACK_SHAPING,
  createAdjustedTrackSource,
  type DriveAudioSource,
  type Recording,
} from '@org/audio-library-models';

import type { OfflineBatchRunner } from '../offline/offline-batch.js';
import type { OfflineState } from '../offline/offline-state-store.js';
import {
  DOWNLOADING_TRACK_LABEL,
  KEEP_TRACK_OFFLINE_LABEL,
  REMOVE_TRACK_OFFLINE_LABEL,
  findRecordingTrack,
  recordingNeedsConnection,
  resolveRecordingOfflineAction,
  runRecordingOfflineAction,
} from './recording-offline.js';

const track = (id: string, overrides: Partial<DriveAudioSource> = {}) =>
  ({
    id,
    provider: 'google-drive',
    driveFileId: `drive-${id}`,
    name: `Song ${id}`,
    mimeType: 'audio/mpeg',
    modifiedTime: 'v1',
    createdAt: 'x',
    availability: { status: 'available' },
    ...overrides,
  }) as DriveAudioSource;

const recordingOf = (
  trackId: string,
): Pick<Recording, 'lineage' | 'source'> => ({
  lineage: {
    track: {
      id: trackId,
      driveFileId: `drive-${trackId}`,
      name: `Song ${trackId}`,
    },
  },
  source: { driveFileId: `drive-${trackId}`, name: `Song ${trackId}` },
});

const states = (map: Record<string, OfflineState>) => (driveFileId: string) =>
  map[driveFileId] ?? 'none';

describe('findRecordingTrack', () => {
  it('finds the parent track, never the adjusted copy, even by Drive file', () => {
    const parent = track('a');
    const adjusted = createAdjustedTrackSource({
      source: parent,
      transform: { ...DEFAULT_PLAYBACK_SHAPING, speedMultiplier: 0.8 },
      createdAt: 'x',
    });

    assert.equal(
      findRecordingTrack(recordingOf('a'), [adjusted, parent]),
      parent,
    );
    assert.equal(
      findRecordingTrack(recordingOf('renamed-id'), [adjusted, parent]),
      undefined,
    );
  });
});

describe('recordingNeedsConnection', () => {
  it('flags a track that is neither cached nor kept', () => {
    const rec = recordingOf('a');

    assert.equal(recordingNeedsConnection(rec, states({})), true);
    assert.equal(
      recordingNeedsConnection(rec, states({ 'drive-a': 'available' })),
      false,
    );
    assert.equal(
      recordingNeedsConnection(rec, states({ 'drive-a': 'kept' })),
      false,
    );
    assert.equal(
      recordingNeedsConnection(rec, states({ 'drive-a': 'downloading' })),
      false,
    );
  });
});

describe('resolveRecordingOfflineAction', () => {
  const sources = [
    track('a'),
    track('b'),
    track('c', { modifiedTime: undefined }),
  ];

  it('offers Keep for a recording whose track is not kept, saying it covers the whole track', () => {
    const result = resolveRecordingOfflineAction([recordingOf('a')], {
      sources,
      stateOf: states({}),
    });

    assert.equal(result.kind, 'keep');
    assert.equal(result.label, KEEP_TRACK_OFFLINE_LABEL);
    assert.match(result.note, /whole track .*Song a.* all its recordings/);
    assert.deepEqual(
      result.sources.map((s) => s.id),
      ['a'],
    );
  });

  it('offers Remove when the track is kept, and a cached-only track still offers Keep', () => {
    const kept = resolveRecordingOfflineAction([recordingOf('a')], {
      sources,
      stateOf: states({ 'drive-a': 'kept' }),
    });
    const cached = resolveRecordingOfflineAction([recordingOf('a')], {
      sources,
      stateOf: states({ 'drive-a': 'available' }),
    });

    assert.equal(kept.kind, 'remove');
    assert.equal(kept.label, REMOVE_TRACK_OFFLINE_LABEL);
    assert.equal(cached.kind, 'keep');
  });

  it('counts a track once for three recordings of two tracks', () => {
    const result = resolveRecordingOfflineAction(
      [recordingOf('a'), recordingOf('a'), recordingOf('b')],
      { sources, stateOf: states({}) },
    );

    assert.deepEqual(
      result.sources.map((s) => s.id),
      ['a', 'b'],
    );
    assert.match(result.note, /2 whole tracks and all their recordings/);
  });

  it('keeps only the tracks that are not kept yet in a mixed selection', () => {
    const result = resolveRecordingOfflineAction(
      [recordingOf('a'), recordingOf('b')],
      { sources, stateOf: states({ 'drive-a': 'kept' }) },
    );

    assert.equal(result.kind, 'keep');
    assert.deepEqual(
      result.sources.map((s) => s.id),
      ['b'],
    );
  });

  it('is a disabled Downloading… while the missing tracks are being fetched', () => {
    const result = resolveRecordingOfflineAction([recordingOf('a')], {
      sources,
      stateOf: states({ 'drive-a': 'downloading' }),
    });

    assert.equal(result.kind, 'downloading');
    assert.equal(result.label, DOWNLOADING_TRACK_LABEL);
    assert.equal(result.disabled, true);
  });

  it('is disabled for a track with no Drive version and when the track left the library', () => {
    const noVersion = resolveRecordingOfflineAction([recordingOf('c')], {
      sources,
      stateOf: states({}),
    });
    const gone = resolveRecordingOfflineAction([recordingOf('zzz')], {
      sources,
      stateOf: states({}),
    });

    assert.equal(noVersion.disabled, true);
    assert.equal(gone.kind, 'unavailable');
    assert.equal(gone.disabled, true);
  });
});

describe('runRecordingOfflineAction', () => {
  const makeRunner = () => {
    const calls: string[] = [];
    const runner: OfflineBatchRunner = {
      keepSources: async (list) => {
        calls.push(`keep ${list.map((s) => s.id).join(',')}`);

        return { kept: list.length, failed: 0, notStored: 0 };
      },
      removeSources: async (list) => {
        calls.push(`remove ${list.map((s) => s.id).join(',')}`);
      },
    };

    return { runner, calls };
  };
  const sources = [track('a'), track('b')];

  it('keeps and removes the tracks through the library batch runner', async () => {
    const { runner, calls } = makeRunner();
    const keep = resolveRecordingOfflineAction(
      [recordingOf('a'), recordingOf('b')],
      {
        sources,
        stateOf: states({}),
      },
    );
    const remove = resolveRecordingOfflineAction([recordingOf('a')], {
      sources,
      stateOf: states({ 'drive-a': 'kept' }),
    });

    assert.deepEqual(await runRecordingOfflineAction(keep, runner), {
      kept: 2,
      failed: 0,
      notStored: 0,
    });
    await runRecordingOfflineAction(remove, runner);

    assert.deepEqual(calls, ['keep a,b', 'remove a']);
  });

  it('does nothing for a disabled action', async () => {
    const { runner, calls } = makeRunner();
    const gone = resolveRecordingOfflineAction([recordingOf('zzz')], {
      sources,
      stateOf: states({}),
    });

    assert.equal(await runRecordingOfflineAction(gone, runner), null);
    assert.deepEqual(calls, []);
  });
});
