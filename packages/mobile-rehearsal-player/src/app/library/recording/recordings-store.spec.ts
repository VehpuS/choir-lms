import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { decodeWav } from '@org/audio-mixing';
import type { Recording } from '@org/audio-library-models';

import {
  createRecordingsStore,
  createUnavailableRecordingsStore,
} from './recordings-store.js';
import {
  createMemoryRecordingsBackend,
  readStoredSamples,
} from './recordings-test-support.js';

const recording = (
  id: string,
  overrides: Partial<Recording> = {},
): Recording => ({
  id,
  name: `Recording ${id}`,
  createdAt: `2026-01-0${id}T00:00:00.000Z`,
  durationMs: 0,
  sampleRate: 8000,
  sizeBytes: 0,
  appliedLatencyMs: 0,
  nudgeMs: 0,
  source: { driveFileId: 'drive-1', name: 'Song.mp3' },
  lineage: {
    track: { id: 'track-1', driveFileId: 'drive-1', name: 'Song.mp3' },
  },
  shaping: { rate: 1, pitchSemitones: 0 },
  balance: 50,
  engineVersion: 1,
  markers: [],
  timeline: [],
  ...overrides,
});

const setup = () => {
  const memory = createMemoryRecordingsBackend();
  const persistence: number[] = [];
  const store = createRecordingsStore(memory.backend, {
    requestPersistence: async () => {
      persistence.push(1);
    },
  });

  return { ...memory, store, persistence };
};

const record = async (
  t: ReturnType<typeof setup>,
  id: string,
  chunks: Int16Array[],
  overrides: Partial<Recording> = {},
) => {
  await t.store.create(recording(id, overrides));
  let elapsed = 0;

  for (const chunk of chunks) {
    elapsed += (chunk.length / 8000) * 1000;
    await t.store.appendChunk(id, chunk, { durationMs: elapsed, timeline: [] });
  }

  const samples = chunks.reduce((n, c) => n + c.length, 0);

  await t.store.complete(
    recording(id, {
      durationMs: elapsed,
      sizeBytes: samples * 2,
      ...overrides,
    }),
  );
};

describe('recordings store', () => {
  it('lists a recording only once it is complete, with its checkpointed size while recording', async () => {
    const t = setup();

    await t.store.create(recording('1'));
    await t.store.appendChunk('1', Int16Array.of(1, 2, 3), {
      durationMs: 1,
      timeline: [],
    });

    assert.deepEqual(await t.store.list(), []);
    assert.deepEqual(
      (await t.store.listIncomplete()).map((r) => r.id),
      ['1'],
    );
    assert.equal(await t.store.totalSizeBytes(), 6);

    await t.store.complete(recording('1', { sizeBytes: 6 }));

    assert.deepEqual(
      (await t.store.list()).map((r) => r.id),
      ['1'],
    );
    assert.deepEqual(await t.store.listIncomplete(), []);
  });

  it('assembles a WAV from the chunks that decodes to the recorded samples', async () => {
    const t = setup();

    await record(t, '1', [Int16Array.of(1, -2, 3), Int16Array.of(4, 5)]);
    const decoded = decodeWav(
      new Uint8Array(
        await ((await t.store.getWavBlob('1')) as Blob).arrayBuffer(),
      ),
    );

    assert.ok(decoded.ok);
    assert.equal(decoded.wav.sampleRate, 8000);
    assert.deepEqual([...decoded.wav.samples], [1, -2, 3, 4, 5]);
    assert.equal(await t.store.getWavBlob('missing'), null);
  });

  it('lists newest first, by owner, across the library', async () => {
    const t = setup();
    const loopLineage = {
      track: { id: 'track-1', driveFileId: 'd', name: 'Song' },
      loop: { id: 'loop-1', name: 'Verse', startMs: 0, endMs: 1 },
    };

    await record(t, '1', [Int16Array.of(1)]);
    await record(t, '2', [Int16Array.of(1)], { lineage: loopLineage });
    await record(t, '3', [Int16Array.of(1)]);

    assert.deepEqual(
      (await t.store.list()).map((r) => r.id),
      ['3', '2', '1'],
    );
    assert.deepEqual(
      (await t.store.listByOwner({ kind: 'track', id: 'track-1' })).map(
        (r) => r.id,
      ),
      ['3', '1'],
    );
    assert.deepEqual(
      (await t.store.listByOwner({ kind: 'loop', id: 'loop-1' })).map(
        (r) => r.id,
      ),
      ['2'],
    );
  });

  it('renames and updates nudge and balance without touching the audio', async () => {
    const t = setup();

    await record(t, '1', [Int16Array.of(7, 8)]);
    await t.store.update('1', { name: 'Take two', nudgeMs: -12, balance: 70 });
    const stored = await t.store.get('1');

    assert.equal(stored?.name, 'Take two');
    assert.equal(stored?.nudgeMs, -12);
    assert.equal(stored?.balance, 70);
    assert.equal(t.chunkCount('1'), 1);
  });

  it('keeps both of two updates made at once, such as a rename and a recorded export', async () => {
    const t = setup();
    const exports = {
      done: [
        {
          driveFileId: 'file-1',
          exportedAt: '2026-11-02T10:00:00.000Z',
          fileName: 'Song - Recording 1.wav',
          folderId: 'folder-1',
          folderName: 'Choir Recordings',
          kind: 'recording' as const,
        },
      ],
      failed: [],
    };

    await record(t, '1', [Int16Array.of(7, 8)]);
    await Promise.all([
      t.store.update('1', { name: 'Take two' }),
      t.store.update('1', { exports }),
      t.store.update('1', { balance: 30 }),
    ]);
    const stored = await t.store.get('1');

    assert.equal(stored?.name, 'Take two');
    assert.equal(stored?.balance, 30);
    assert.deepEqual(stored?.exports, exports);
  });

  it('works a patch out from the stored recording, in turn with other updates', async () => {
    const t = setup();

    await record(t, '1', [Int16Array.of(7, 8)]);
    await Promise.all([
      t.store.modify('1', (stored) => ({ name: `${stored.name}!` })),
      t.store.modify('1', (stored) => ({ name: `${stored.name}?` })),
    ]);

    assert.equal((await t.store.get('1'))?.name, 'Recording 1!?');
  });

  it('removes the record and its chunks on delete, and the total drops', async () => {
    const t = setup();

    await record(t, '1', [Int16Array.of(1, 2)]);
    await record(t, '2', [Int16Array.of(1, 2, 3)]);
    assert.equal(await t.store.totalSizeBytes(), 10);

    await t.store.delete('1');

    assert.equal(await t.store.get('1'), null);
    assert.equal(t.chunkCount('1'), 0);
    assert.equal(await t.store.totalSizeBytes(), 6);
  });

  it('leaves no trace of a chunk whose append failed, so a retry cannot duplicate it', async () => {
    const t = setup();

    await t.store.create(recording('1'));
    await t.store.appendChunk('1', Int16Array.of(1, 2), {
      durationMs: 1,
      timeline: [],
    });
    t.failNextAppends(1);

    await assert.rejects(
      t.store.appendChunk('1', Int16Array.of(3, 4), {
        durationMs: 2,
        timeline: [],
      }),
    );
    await t.store.appendChunk('1', Int16Array.of(3, 4), {
      durationMs: 2,
      timeline: [],
    });
    await t.store.complete(recording('1', { sizeBytes: 8 }));
    assert.deepEqual(await readStoredSamples(t.store, '1'), [1, 2, 3, 4]);
    assert.equal(t.chunkCount('1'), 2);
  });

  it('keeps every chunk written before a failure when the rest cannot be stored', async () => {
    const t = setup();

    await t.store.create(recording('1'));
    await t.store.appendChunk('1', Int16Array.of(1, 2), {
      durationMs: 1,
      timeline: [],
    });
    t.failNextAppends(5);
    await assert.rejects(
      t.store.appendChunk('1', Int16Array.of(3), {
        durationMs: 2,
        timeline: [],
      }),
    );
    assert.deepEqual(await readStoredSamples(t.store, '1'), [1, 2]);
  });

  it('asks for persistent storage once, when the first recording completes', async () => {
    const t = setup();

    await t.store.create(recording('1'));
    assert.deepEqual(t.persistence, []);

    await record(t, '2', [Int16Array.of(1)]);
    await record(t, '3', [Int16Array.of(1)]);

    assert.deepEqual(t.persistence, [1]);
  });

  it('survives a persistence request that throws', async () => {
    const memory = createMemoryRecordingsBackend();
    const store = createRecordingsStore(memory.backend, {
      requestPersistence: async () => {
        throw new Error('blocked');
      },
    });

    await store.create(recording('1'));
    await store.complete(recording('1'));

    assert.equal((await store.list()).length, 1);
  });
});

describe('unavailable recordings store', () => {
  it('reads as empty and refuses to write', async () => {
    const store = createUnavailableRecordingsStore();

    assert.deepEqual(await store.list(), []);
    assert.equal(await store.totalSizeBytes(), 0);
    await assert.rejects(store.create(recording('1')));
  });
});

describe('what never removes a recording', () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const appSource = join(here, '../..');
  const files = (directory: string): string[] =>
    readdirSync(directory).flatMap((name) => {
      const path = join(directory, name);

      if (statSync(path).isDirectory()) {
        return files(path);
      }

      return /\.tsx?$/.test(name) && !/\.spec\.tsx?$/.test(name) ? [path] : [];
    });
  // Cache clearing, track eviction, offline cleanup, and forgetting a Drive
  // session live in these places; none may reach the recordings store.
  const clearingCode = [
    ...files(join(appSource, 'library/playback/audio-cache')),
    ...files(join(appSource, 'library/offline')),
    ...files(join(appSource, 'auth')),
  ];

  it('is the case that cache, eviction, sign-out, and session code never touch the recordings store', () => {
    const offenders = clearingCode.filter((path) =>
      /recordings-store|recordings-backend|choirlms-recordings|library\/recording\/|\.\.\/recording\//.test(
        readFileSync(path, 'utf8'),
      ),
    );

    assert.deepEqual(offenders, []);
  });

  it('exposes delete as the only way to remove a recording', () => {
    const t = setup();
    const removers = Object.keys(t.store).filter((name) =>
      /delete|remove|clear|evict|purge|expire/i.test(name),
    );

    assert.deepEqual(removers, ['delete']);
  });
});
