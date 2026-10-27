import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types';
import {
  UNKNOWN_OFFLINE_FILE_NAME,
  buildOfflineStorageSnapshot,
} from './offline-storage-model.js';

const entry = (overrides: Partial<AudioStoreEntry>): AudioStoreEntry => {
  return {
    driveFileId: 'file-a',
    sizeBytes: 10,
    sourceVersion: 'v1',
    touchedAt: 1,
    ...overrides,
  };
};

const snapshotOf = (
  entries: AudioStoreEntry[],
  options: { names?: Record<string, string>; sort?: 'recent' | 'size' } = {},
) => {
  return buildOfflineStorageSnapshot({
    budgetBytes: 100,
    entries,
    libraryNames: new Map(Object.entries(options.names ?? {})),
    sort: options.sort ?? 'recent',
  });
};

describe('offline storage snapshot', () => {
  it('splits kept from automatic files and totals them separately', () => {
    const snapshot = snapshotOf([
      entry({ driveFileId: 'a', sizeBytes: 30, pinned: true }),
      entry({ driveFileId: 'b', sizeBytes: 20 }),
      entry({ driveFileId: 'c', sizeBytes: 5 }),
    ]);

    assert.deepEqual(
      snapshot.kept.map((row) => row.driveFileId),
      ['a'],
    );
    assert.deepEqual(snapshot.summary, {
      automaticBytes: 25,
      budgetBytes: 100,
      keptBytes: 30,
    });
  });

  it('prefers the recorded name, then the library name, then a fallback', () => {
    const snapshot = snapshotOf(
      [
        entry({ driveFileId: 'a', name: 'Recorded.mp3' }),
        entry({ driveFileId: 'b' }),
        entry({ driveFileId: 'c' }),
      ],
      { names: { a: 'Library A', b: 'Library B' } },
    );
    const names = Object.fromEntries(
      snapshot.automatic.map((row) => [row.driveFileId, row.name]),
    );

    assert.deepEqual(names, {
      a: 'Recorded.mp3',
      b: 'Library B',
      c: UNKNOWN_OFFLINE_FILE_NAME,
    });
  });

  it('sorts by most recent use or by size, largest first', () => {
    const entries = [
      entry({ driveFileId: 'old-big', sizeBytes: 50, touchedAt: 1 }),
      entry({ driveFileId: 'new-small', sizeBytes: 5, touchedAt: 9 }),
    ];

    assert.deepEqual(
      snapshotOf(entries).automatic.map((row) => row.driveFileId),
      ['new-small', 'old-big'],
    );
    assert.deepEqual(
      snapshotOf(entries, { sort: 'size' }).automatic.map(
        (row) => row.driveFileId,
      ),
      ['old-big', 'new-small'],
    );
  });

  describe('score files', () => {
    const track = entry({ driveFileId: 'track', pinned: true, sizeBytes: 50 });
    const score = (overrides: Partial<AudioStoreEntry> = {}) =>
      entry({
        driveFileId: 'score',
        kind: 'score',
        name: 'Full score.pdf',
        ownerIds: ['track'],
        pinned: true,
        sizeBytes: 4,
        ...overrides,
      });

    it('nests a score under its kept track and counts it as kept', () => {
      const snapshot = snapshotOf([track, score()]);

      assert.equal(snapshot.kept.length, 1);
      assert.deepEqual(
        snapshot.kept[0]?.scores?.map(({ name }) => name),
        ['Full score.pdf'],
      );
      assert.equal(snapshot.summary.keptBytes, 54);
    });

    it('lists a score under every track that uses it, counting it once', () => {
      const other = entry({ driveFileId: 'other', pinned: true, sizeBytes: 6 });
      const snapshot = snapshotOf([
        track,
        other,
        score({ ownerIds: ['track', 'other'] }),
      ]);

      assert.equal(snapshot.kept.length, 2);
      assert.ok(snapshot.kept.every(({ scores }) => scores?.length === 1));
      assert.equal(snapshot.summary.keptBytes, 60);
    });

    it('gives a score whose track is gone a row of its own', () => {
      const snapshot = snapshotOf([score({ ownerIds: ['gone'] })]);

      assert.deepEqual(
        snapshot.kept.map(({ driveFileId }) => driveFileId),
        ['score'],
      );
    });
  });
});
