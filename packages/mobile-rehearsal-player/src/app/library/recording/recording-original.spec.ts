import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  OriginalUnavailableError,
  resolveRecordingOriginal,
  type OriginalAudioDependencies,
} from './recording-original.js';

const recording = {
  source: { driveFileId: 'drive-1', name: 'Song', contentVersion: 'v1' },
};
const blob = new Blob(['x']);

type Overrides = Partial<{
  stored: { sourceVersion: string; kind?: 'score' } | null;
  library: { modifiedTime?: string } | undefined;
  online: boolean;
  downloadError: unknown;
}>;

const setup = (overrides: Overrides = {}) => {
  const calls: string[] = [];
  const o = {
    stored: null,
    library: { modifiedTime: 'v1' },
    online: true,
    ...overrides,
  };
  const deps: OriginalAudioDependencies = {
    listStored: async () => {
      calls.push('list');

      return o.stored
        ? [{ driveFileId: 'drive-1', sizeBytes: 1, touchedAt: 0, ...o.stored }]
        : [];
    },
    readStored: async (_id, version) => {
      calls.push(`read ${version}`);

      return blob;
    },
    download: async (_id, version) => {
      calls.push(`download ${version}`);

      if (o.downloadError) {
        throw o.downloadError;
      }

      return blob;
    },
    findLibraryTrack: () => o.library,
    isOnline: () => o.online,
    isNotFound: (error) => error === 'not-found',
  };

  return { deps, calls };
};

describe('resolveRecordingOriginal', () => {
  it('uses the stored copy at the recorded version, offline included, without downloading', async () => {
    const t = setup({ stored: { sourceVersion: 'v1' }, online: false });
    const result = await resolveRecordingOriginal(recording, t.deps);

    assert.ok(result.status === 'ready');
    assert.equal(result.origin, 'stored');
    assert.equal(result.changed, false);
    assert.equal(await result.load(), blob);
    assert.deepEqual(t.calls, ['list', 'read v1']);
  });

  it('resolves an evicted original from Drive when online, only listing the store', async () => {
    const t = setup();
    const result = await resolveRecordingOriginal(recording, t.deps);

    assert.ok(result.status === 'ready');
    assert.equal(result.origin, 'drive');
    assert.equal(result.changed, false);
    // Resolving only lists entries: no read, so no stale-file drop, and no download yet.
    assert.deepEqual(t.calls, ['list']);

    await result.load();

    assert.deepEqual(t.calls, ['list', 'download v1']);
  });

  it('says the overlay needs a connection when evicted and offline', async () => {
    const result = await resolveRecordingOriginal(
      recording,
      setup({ online: false }).deps,
    );

    assert.ok(result.status === 'unavailable');
    assert.equal(result.reason, 'offline');
    assert.match(result.message, /needs a connection/);
  });

  it('marks the original changed when the stored or the Drive version differs', async () => {
    const stored = await resolveRecordingOriginal(
      recording,
      setup({ stored: { sourceVersion: 'v2' } }).deps,
    );
    const drive = await resolveRecordingOriginal(
      recording,
      setup({ library: { modifiedTime: 'v2' } }).deps,
    );

    assert.ok(stored.status === 'ready' && stored.changed);
    assert.ok(drive.status === 'ready' && drive.changed);
    assert.equal(drive.status === 'ready' && drive.origin, 'drive');
  });

  it('cannot tell a change when the recording has no recorded version', async () => {
    const result = await resolveRecordingOriginal(
      { source: { driveFileId: 'drive-1', name: 'Song' } },
      setup({ stored: { sourceVersion: 'v9' } }).deps,
    );

    assert.ok(result.status === 'ready');
    assert.equal(result.changed, false);
  });

  it('is unavailable when the track left the library and nothing is stored', async () => {
    const result = await resolveRecordingOriginal(
      recording,
      setup({ library: undefined }).deps,
    );

    assert.ok(result.status === 'unavailable');
    assert.equal(result.reason, 'removed');
  });

  it('plays from a stored copy even after the track left the library', async () => {
    const result = await resolveRecordingOriginal(
      recording,
      setup({ library: undefined, stored: { sourceVersion: 'v1' } }).deps,
    );

    assert.ok(result.status === 'ready');
  });

  it('turns a not-found download into a deleted-from-Drive failure and rethrows others', async () => {
    const gone = await resolveRecordingOriginal(
      recording,
      setup({ downloadError: 'not-found' }).deps,
    );
    const flaky = await resolveRecordingOriginal(
      recording,
      setup({ downloadError: 'timeout' }).deps,
    );

    assert.ok(gone.status === 'ready' && flaky.status === 'ready');
    await assert.rejects(
      gone.load(),
      (error) =>
        error instanceof OriginalUnavailableError && error.reason === 'deleted',
    );
    await assert.rejects(flaky.load(), (error) => error === 'timeout');
  });

  it('ignores a stored score file with the same Drive id', async () => {
    const result = await resolveRecordingOriginal(
      recording,
      setup({ stored: { sourceVersion: 'v1', kind: 'score' }, online: false })
        .deps,
    );

    assert.ok(result.status === 'unavailable');
  });
});
