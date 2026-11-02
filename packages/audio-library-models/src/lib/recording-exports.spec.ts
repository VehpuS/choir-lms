import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  clearExportFailures,
  getMissingExportKinds,
  getRecordingExports,
  getRecordingExportStatus,
  getWantedExportKinds,
  isExported,
  recordExportDone,
  recordExportFailure,
} from './recording-exports.ts';
import type { RecordingExportDone } from './recording.ts';

const done = (
  kind: 'recording' | 'mix',
  driveFileId = 'f1',
): RecordingExportDone => ({
  driveFileId,
  exportedAt: '2026-11-02T10:00:00.000Z',
  fileName: 'Song - Recording 1.wav',
  folderId: 'folder-1',
  folderName: 'Choir Recordings',
  kind,
});
const failure = (kind: 'recording' | 'mix', reason = 'quota') => ({
  failedAt: '2026-11-02T10:05:00.000Z',
  kind,
  reason,
});

describe('recording exports', () => {
  it('reads a recording made before exports were kept as having none', () => {
    assert.deepEqual(getRecordingExports({}), { done: [], failed: [] });
    assert.equal(isExported({}, 'recording'), false);
  });

  it('wants the recording alone first, then the mix', () => {
    assert.deepEqual(getWantedExportKinds('both'), ['recording', 'mix']);
    assert.deepEqual(getWantedExportKinds('mix'), ['mix']);
  });

  it('records one copy per kind and clears that kind’s failure', () => {
    const failed = { exports: recordExportFailure({}, failure('mix')) };
    const first = recordExportDone(failed, done('mix', 'f1'));
    const again = recordExportDone({ exports: first }, done('mix', 'f2'));

    assert.deepEqual(first.failed, []);
    assert.deepEqual(
      again.done.map((entry) => entry.driveFileId),
      ['f2'],
    );
  });

  it('does not record a failure for a kind that already reached Drive', () => {
    const recording = { exports: recordExportDone({}, done('recording')) };

    assert.deepEqual(
      recordExportFailure(recording, failure('recording')),
      recording.exports,
    );
  });

  it('lists only the wanted kinds that are missing', () => {
    const recording = { exports: recordExportDone({}, done('recording')) };

    assert.deepEqual(getMissingExportKinds(recording, 'both'), ['mix']);
    assert.deepEqual(getMissingExportKinds(recording, 'recording'), []);
  });

  it('clears failures for the retry, all or by kind', () => {
    const exports = recordExportFailure(
      { exports: recordExportFailure({}, failure('recording')) },
      failure('mix'),
    );

    assert.deepEqual(
      clearExportFailures({ exports }, ['mix']).failed.map((f) => f.kind),
      ['recording'],
    );
    assert.deepEqual(clearExportFailures({ exports }).failed, []);
  });

  describe('getRecordingExportStatus', () => {
    it('is none with nothing asked for and nothing on Drive, on-drive once a copy exists', () => {
      assert.deepEqual(getRecordingExportStatus({}, null), { state: 'none' });
      assert.deepEqual(
        getRecordingExportStatus(
          { exports: recordExportDone({}, done('mix')) },
          null,
        ),
        { kinds: ['mix'], state: 'on-drive' },
      );
    });

    it('is pending while a wanted kind is missing and on-drive when all are there', () => {
      const partial = { exports: recordExportDone({}, done('recording')) };
      const full = { exports: recordExportDone(partial, done('mix')) };

      assert.deepEqual(getRecordingExportStatus(partial, 'both'), {
        kinds: ['mix'],
        state: 'pending',
      });
      assert.equal(getRecordingExportStatus(full, 'both').state, 'on-drive');
    });

    it('is failed for a wanted kind that failed, but ignores a failure for a kind not wanted', () => {
      const recording = { exports: recordExportFailure({}, failure('mix')) };

      assert.equal(getRecordingExportStatus(recording, 'both').state, 'failed');
      assert.deepEqual(getRecordingExportStatus(recording, 'recording'), {
        kinds: ['recording'],
        state: 'pending',
      });
    });
  });
});
