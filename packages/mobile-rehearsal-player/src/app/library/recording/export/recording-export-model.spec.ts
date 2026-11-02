import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRecordingFixture } from '../recording-fixtures';
import {
  createExportRun,
  defaultExportFileName,
  describeDestination,
  describeMixAvailability,
  exportFailureMessage,
  exportRunProgress,
  normalizeExportFileName,
  reduceExportRun,
  summarizeExportRun,
  type ExportRun,
  type ExportRunEvent,
} from './recording-export-model';

const run = (events: ExportRunEvent[], start?: ExportRun) =>
  events.reduce(
    reduceExportRun,
    start ??
      createExportRun([
        { fileName: 'A.wav', recordingId: 'a' },
        { fileName: 'B.wav', recordingId: 'b' },
      ]),
  );

describe('defaultExportFileName', () => {
  const recording = buildRecordingFixture({
    name: 'Recording 3',
    source: {
      contentVersion: 'v1',
      driveFileId: 'drive-1',
      durationMs: 1,
      name: 'Sleep Song.mp3',
    },
  });

  it('names a recording from its track and name, and a mix with a suffix', () => {
    assert.equal(
      defaultExportFileName(recording, 'recording'),
      'Sleep Song - Recording 3.wav',
    );
    assert.equal(
      defaultExportFileName(recording, 'mix'),
      'Sleep Song - Recording 3 (mix).wav',
    );
  });

  it('replaces characters a file name cannot hold', () => {
    const odd = buildRecordingFixture({
      name: 'Take: 1/2',
      source: {
        contentVersion: 'v1',
        driveFileId: 'd',
        durationMs: 1,
        name: 'A*B.mp3',
      },
    });

    assert.equal(
      defaultExportFileName(odd, 'recording'),
      'A-B - Take- 1-2.wav',
    );
  });
});

describe('normalizeExportFileName', () => {
  it('adds one .wav, trims, and falls back to the default for an empty name', () => {
    assert.equal(
      normalizeExportFileName('  My take  ', 'D.wav'),
      'My take.wav',
    );
    assert.equal(
      normalizeExportFileName('My take.WAV', 'D.wav'),
      'My take.wav',
    );
    assert.equal(normalizeExportFileName('   ', 'D.wav'), 'D.wav');
    assert.equal(normalizeExportFileName('.wav', 'D.wav'), 'D.wav');
  });
});

describe('describeMixAvailability', () => {
  it('is ready, warns when the original changed, and explains when it is unavailable', () => {
    const ready = {
      changed: false,
      load: async () => ({}) as Blob,
      origin: 'stored',
      status: 'ready',
    } as const;

    assert.deepEqual(describeMixAvailability(ready), { state: 'ready' });
    assert.equal(
      describeMixAvailability({ ...ready, changed: true }).state,
      'changed',
    );

    const unavailable = describeMixAvailability({
      message:
        'The track was deleted from Drive, so the recording plays alone.',
      reason: 'deleted',
      status: 'unavailable',
    });

    assert.equal(unavailable.state, 'unavailable');
    assert.match(
      unavailable.state === 'unavailable' ? unavailable.message : '',
      /recording alone can still be exported/,
    );
  });
});

describe('exportFailureMessage', () => {
  it('has words for every reason', () => {
    for (const reason of [
      'needs-write-access',
      'quota',
      'folder-not-writable',
      'offline',
      'too-large',
      'unavailable',
      'recording-missing',
      'original',
      'render',
      'download',
    ] as const) {
      assert.ok(exportFailureMessage(reason).length > 10);
    }
  });
});

describe('reduceExportRun', () => {
  it('tracks one item through rendering and uploading to done', () => {
    const after = run([
      { recordingId: 'a', status: 'rendering', type: 'item-started' },
      { progress: 0.5, recordingId: 'a', type: 'item-progress' },
      { recordingId: 'a', status: 'uploading', type: 'item-started' },
      { recordingId: 'a', resumeUri: 'https://u/1', type: 'item-session' },
      { recordingId: 'a', savedTo: 'Choir', type: 'item-done' },
    ]);

    assert.deepEqual(
      [
        after.items[0]?.status,
        after.items[0]?.progress,
        after.items[0]?.savedTo,
        after.items[0]?.resumeUri,
      ],
      ['done', 1, 'Choir', undefined],
    );
  });

  it('keeps the upload session after a connection failure but drops it after a refusal', () => {
    const session: ExportRunEvent = {
      recordingId: 'a',
      resumeUri: 'https://u/1',
      type: 'item-session',
    };
    const offline = run([
      session,
      { reason: 'offline', recordingId: 'a', type: 'item-failed' },
    ]);
    const quota = run([
      session,
      { reason: 'quota', recordingId: 'a', type: 'item-failed' },
    ]);

    assert.equal(offline.items[0]?.resumeUri, 'https://u/1');
    assert.equal(quota.items[0]?.resumeUri, undefined);
  });

  it('retries only the failed items and keeps finished ones', () => {
    const failed = run([
      { recordingId: 'a', savedTo: 'Choir', type: 'item-done' },
      { reason: 'offline', recordingId: 'b', type: 'item-failed' },
      { type: 'finished' },
    ]);
    const retried = reduceExportRun(failed, { type: 'retry' });

    assert.deepEqual(
      retried.items.map((item) => item.status),
      ['done', 'pending'],
    );
    assert.equal(retried.step, 'running');
  });

  it('records a skipped mix with its message and a cancel', () => {
    const after = run([
      { message: 'No original.', recordingId: 'a', type: 'item-skipped' },
      { type: 'cancelled' },
    ]);

    assert.equal(after.items[0]?.skippedMessage, 'No original.');
    assert.equal(after.step, 'cancelled');
  });
});

describe('exportRunProgress and summarizeExportRun', () => {
  it('averages item progress, counting skipped as complete and failed as none', () => {
    const after = run([
      { recordingId: 'a', savedTo: 'x', type: 'item-done' },
      { reason: 'quota', recordingId: 'b', type: 'item-failed' },
    ]);

    assert.equal(exportRunProgress(after), 0.5);
    assert.deepEqual(summarizeExportRun(after), {
      done: 1,
      failed: 1,
      firstFailure: 'quota',
      skipped: 0,
      total: 2,
    });
    assert.equal(exportRunProgress(createExportRun([])), 1);
  });
});

describe('describeDestination', () => {
  it('names the folder, or Downloads for a download', () => {
    assert.equal(describeDestination('drive', 'Choir'), 'Choir');
    assert.equal(describeDestination('download', 'Choir'), 'Downloads');
  });
});
