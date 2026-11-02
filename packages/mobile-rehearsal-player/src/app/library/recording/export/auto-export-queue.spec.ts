import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import type { DriveResumableUploadResult } from '@org/google-drive';

import { recording, setUp, waitUntil } from './auto-export-test-helpers';

describe('createAutoExportQueue', () => {
  const queues: Array<{ dispose: () => void }> = [];

  afterEach(() => {
    queues.splice(0).forEach((queue) => queue.dispose());
  });

  const start = async (...args: Parameters<typeof setUp>) => {
    const t = setUp(...args);

    queues.push(t.queue);
    await t.queue.kick();

    return t;
  };

  it('uploads the recording alone, then the mix, and records both on the recording', async () => {
    const t = await start([recording('a')]);

    assert.deepEqual(
      t.uploads.map((upload) => upload.name),
      ['Song - Recording a.wav', 'Song - Recording a (mix).wav'],
    );
    assert.deepEqual(
      t.memory
        .read('a')
        ?.exports?.done.map((entry) => [entry.kind, entry.folderName]),
      [
        ['recording', 'Choir Recordings'],
        ['mix', 'Choir Recordings'],
      ],
    );
  });

  it('never repeats a kind: only the missing mix goes, and nothing on a second pass', async () => {
    const onDrive = {
      done: [
        {
          driveFileId: 'x',
          exportedAt: '',
          fileName: '',
          folderId: 'f',
          folderName: 'F',
          kind: 'recording' as const,
        },
      ],
      failed: [],
    };
    const t = await start([recording('a', undefined, { exports: onDrive })]);

    assert.deepEqual(
      t.uploads.map((upload) => upload.name),
      ['Song - Recording a (mix).wav'],
    );

    await t.queue.kick();
    assert.equal(t.uploads.length, 1);
  });

  it('uploads one at a time, even when kicked repeatedly', async () => {
    const t = setUp([recording('a'), recording('b')]);

    queues.push(t.queue);
    await Promise.all([t.queue.kick(), t.queue.kick(), t.queue.kick()]);

    assert.equal(t.uploads.length, 4);
    assert.equal(t.maxActive(), 1);
  });

  it('waits offline as pending and runs when the connection returns', async () => {
    const t = await start([recording('a')], { online: false });

    assert.equal(t.uploads.length, 0);
    assert.deepEqual(t.queue.getStatus().gate, {
      reason: 'offline',
      state: 'held',
    });

    t.net.change({ online: true });
    await waitUntil(() => t.uploads.length === 2);

    assert.equal(t.uploads.length, 2);
  });

  it('waits without a Drive session, and when auto-export is off', async () => {
    const signedOut = await start([recording('a')], {
      session: { accessToken: undefined, hasWriteAccess: false },
    });
    const off = await start([recording('a')], { settings: { enabled: false } });

    assert.equal(signedOut.uploads.length, 0);
    assert.equal(off.uploads.length, 0);
  });

  it('holds on a reported cellular connection under Wi-Fi only, and runs on any connection', async () => {
    const held = await start([recording('a')], { type: 'cellular' });
    const any = await start([recording('a')], {
      settings: { uploadOver: 'any' },
      type: 'cellular',
    });

    assert.equal(held.uploads.length, 0);
    assert.deepEqual(held.queue.getStatus().gate, {
      reason: 'cellular',
      state: 'held',
    });
    assert.equal(any.uploads.length, 2);
  });

  it('retries a temporary failure after 30 seconds, then 2 minutes, with its upload session', async () => {
    const offline: DriveResumableUploadResult = {
      reason: 'offline',
      resumeUri: 'https://u/1',
      status: 'failed',
    };
    const t = await start([recording('a')], { results: [offline, offline] });

    assert.equal(t.uploads.length, 1);
    assert.equal(t.memory.read('a')?.exports?.failed.length ?? 0, 0);

    await t.clock.advance(29_000);
    assert.equal(t.uploads.length, 1);

    await t.clock.advance(1_000);
    assert.equal(t.uploads.length, 2);

    await t.clock.advance(119_000);
    assert.equal(t.uploads.length, 2);

    await t.clock.advance(1_000);
    // The third attempt succeeds, then the mix follows.
    assert.deepEqual(t.uploads.map((upload) => upload.name).slice(0, 3), [
      'Song - Recording a.wav',
      'Song - Recording a.wav',
      'Song - Recording a.wav',
    ]);
    assert.equal(t.memory.read('a')?.exports?.done.length, 2);
  });

  it('records a refusal as failed and does not retry it, until a manual Retry', async () => {
    const t = await start([recording('a')], {
      results: [{ reason: 'quota', status: 'failed' }],
      settings: { what: 'recording' },
    });

    assert.deepEqual(
      t.memory
        .read('a')
        ?.exports?.failed.map((entry) => [entry.kind, entry.reason]),
      [['recording', 'quota']],
    );

    await t.clock.advance(7_200_000);
    assert.equal(t.uploads.length, 1);

    await t.queue.retry('a');

    assert.equal(t.uploads.length, 2);
    assert.deepEqual(t.memory.read('a')?.exports?.failed, []);
    assert.equal(t.memory.read('a')?.exports?.done.length, 1);
  });

  it('marks a mix whose original is unavailable as failed and still uploads the recording alone', async () => {
    const t = await start([recording('a')], {
      original: {
        message: 'Track deleted.',
        reason: 'deleted',
        status: 'unavailable',
      },
    });

    assert.deepEqual(
      t.uploads.map((upload) => upload.name),
      ['Song - Recording a.wav'],
    );
    assert.deepEqual(
      t.memory
        .read('a')
        ?.exports?.failed.map((entry) => [entry.kind, entry.reason]),
      [['mix', 'original']],
    );
    assert.deepEqual(
      t.memory.read('a')?.exports?.done.map((entry) => entry.kind),
      ['recording'],
    );
  });

  it('leaves recordings made before eligibleFrom alone', async () => {
    const t = await start(
      [
        recording('old', '2026-01-01T00:00:00.000Z'),
        recording('new', '2026-11-02T09:00:00.000Z'),
      ],
      {
        settings: {
          eligibleFrom: '2026-06-01T00:00:00.000Z',
          what: 'recording',
        },
      },
    );

    assert.deepEqual(
      t.uploads.map((upload) => upload.name),
      ['Song - Recording new.wav'],
    );
  });

  it('reports what is running, and releases its timers when disposed', async () => {
    const t = await start([recording('a')], {
      results: [{ reason: 'offline', status: 'failed' }],
    });

    assert.ok(t.clock.pending() > 0);
    t.queue.dispose();
    assert.equal(t.clock.pending(), 0);
  });
});
