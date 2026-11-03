import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { encodeWavParts } from '@org/audio-mixing';

import { reduceExportRun } from './recording-export-model';
import {
  SAMPLE_RATE,
  toBlob,
  storedWav,
  readyOriginal,
  recordingFor,
  setUp,
  run,
  plan,
} from './recording-export-test-helpers';

describe('runRecordingExports', () => {
  it('downloads the stored recording as it is', async () => {
    const { deps, saved, uploads } = setUp();
    const { state } = await run(plan({ destination: 'download' }), deps);

    assert.equal(saved[0]?.fileName, 'a.wav');
    assert.equal(saved[0]?.size, storedWav().size);
    assert.equal(uploads.length, 0);
    assert.equal(state.items[0]?.savedTo, 'Downloads');
    assert.equal(state.step, 'finished');
  });

  it('uploads to the chosen folder with the token, name and progress', async () => {
    const { deps, uploads } = setUp();
    const { state } = await run(plan(), deps);

    assert.equal(uploads[0]?.accessToken, 'token');
    assert.equal(uploads[0]?.folderId, 'folder-1');
    assert.equal(uploads[0]?.name, 'a.wav');
    assert.equal(uploads[0]?.mimeType, 'audio/wav');
    assert.deepEqual(
      [state.items[0]?.status, state.items[0]?.savedTo],
      ['done', 'Choir Recordings'],
    );
  });

  it('renders a mix and downloads it, with the recording mixed over the track', async () => {
    const { deps, saved } = setUp();
    const { events, state } = await run(
      plan({ destination: 'download', kind: 'mix' }),
      deps,
    );

    assert.equal(events[0]?.type, 'item-started');
    assert.equal(state.items[0]?.status, 'done');
    // 1 s of 16-bit mono at 1 kHz plus the 44-byte header.
    assert.equal(saved[0]?.size, 44 + SAMPLE_RATE * 2);
  });

  it('skips a mix whose original is unavailable and goes on to the next', async () => {
    const { deps, uploads } = setUp({
      resolveOriginal: async (recording) =>
        recording.id === 'a'
          ? {
              message: 'Track deleted.',
              reason: 'deleted',
              status: 'unavailable',
            }
          : readyOriginal,
    });
    const { state } = await run(plan({ kind: 'mix' }, ['a', 'b']), deps);

    assert.deepEqual(
      state.items.map((item) => item.status),
      ['skipped', 'done'],
    );
    assert.equal(state.items[0]?.skippedMessage, 'Track deleted.');
    assert.equal(uploads.length, 1);
  });

  it('fails an item and carries on with the next one', async () => {
    const { deps } = setUp({
      readRecording: async (id) => (id === 'a' ? null : storedWav()),
    });
    const { state } = await run(plan({}, ['a', 'b']), deps);

    assert.deepEqual(
      state.items.map((item) => item.status),
      ['failed', 'done'],
    );
    assert.equal(state.items[0]?.failure, 'recording-missing');
  });

  it('keeps the upload session after a dropped connection and resumes it on a retry', async () => {
    const offline = setUp(
      {},
      {
        reason: 'offline',
        resumeUri: 'https://upload/session',
        status: 'failed',
      },
    );
    const first = await run(plan(), offline.deps);

    assert.equal(first.state.items[0]?.failure, 'offline');
    assert.equal(first.state.items[0]?.resumeUri, 'https://upload/session');

    const retry = setUp();
    const retried = reduceExportRun(first.state, { type: 'retry' });
    const second = await run(
      plan({
        items: [
          {
            fileName: 'a.wav',
            recording: recordingFor('a'),
            resumeUri: first.state.items[0]?.resumeUri,
          },
        ],
      }),
      retry.deps,
    );

    assert.equal(retried.items[0]?.status, 'pending');
    assert.equal(retry.uploads[0]?.resumeUri, 'https://upload/session');
    assert.equal(second.state.items[0]?.status, 'done');
  });

  it('hands each uploaded copy to recordUploaded, and never for a download', async () => {
    const recorded: Array<{
      id: string;
      kind: string;
      file: string;
      folder: string;
    }> = [];
    const { deps } = setUp({
      recordUploaded: (recording, entry) => {
        recorded.push({
          file: entry.file.id,
          folder: entry.folder.folderId,
          id: recording.id,
          kind: entry.kind,
        });
      },
    });

    await run(plan({}, ['a', 'b']), deps);
    await run(plan({ destination: 'download' }, ['c']), deps);

    assert.deepEqual(recorded, [
      { file: 'new-1', folder: 'folder-1', id: 'a', kind: 'recording' },
      { file: 'new-1', folder: 'folder-1', id: 'b', kind: 'recording' },
    ]);
  });

  it('still reports done when noting the copy fails', async () => {
    const { deps } = setUp({
      recordUploaded: () => {
        throw new Error('store unavailable');
      },
    });
    const { state } = await run(plan(), deps);

    assert.equal(state.items[0]?.status, 'done');
  });

  it('treats a recording with no stored audio as missing, and uploads nothing', async () => {
    const emptyWav = toBlob(
      encodeWavParts([new Int16Array(0)], {
        channels: 1,
        sampleRate: SAMPLE_RATE,
      }),
    );
    const { deps, uploads } = setUp({ readRecording: async () => emptyWav });
    const recordingOnly = await run(plan(), deps);
    const mix = await run(plan({ kind: 'mix' }), deps);

    assert.equal(recordingOnly.state.items[0]?.failure, 'recording-missing');
    assert.equal(mix.state.items[0]?.failure, 'recording-missing');
    assert.equal(uploads.length, 0);
  });

  it('fails with a missing permission when there is no access token', async () => {
    const { deps, uploads } = setUp();
    const { state } = await run(plan({ accessToken: undefined }), deps);

    assert.equal(state.items[0]?.failure, 'needs-write-access');
    assert.equal(uploads.length, 0);
  });

  it('reports a browser download failure', async () => {
    const { deps } = setUp({
      saveToDevice: () => {
        throw new Error('blocked');
      },
    });
    const { state } = await run(plan({ destination: 'download' }), deps);

    assert.equal(state.items[0]?.failure, 'download');
  });

  it('stops at once when cancelled and does not start later items', async () => {
    const controller = new AbortController();
    const { deps, uploads } = setUp({
      upload: async (options) => {
        controller.abort();
        void options;

        return { status: 'aborted' };
      },
    });
    const { events, state } = await run(
      plan({}, ['a', 'b']),
      deps,
      controller.signal,
    );

    assert.equal(state.step, 'cancelled');
    assert.equal(uploads.length, 0);
    assert.equal(
      events.filter((event) => event.type === 'item-started').length,
      1,
    );
  });

  it('does nothing when already cancelled', async () => {
    const controller = new AbortController();

    controller.abort();

    const { deps, saved } = setUp();
    const { state } = await run(
      plan({ destination: 'download' }),
      deps,
      controller.signal,
    );

    assert.equal(state.step, 'cancelled');
    assert.equal(saved.length, 0);
  });
});
