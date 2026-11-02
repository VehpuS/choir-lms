import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Recording } from '@org/audio-library-models';

import { buildRecordingFixture } from '../recording-fixtures';
import {
  recordDriveExportDone,
  recordDriveExportFailure,
} from './record-drive-export';

const NOW = new Date('2026-11-02T10:00:00.000Z');
const FOLDER = { folderId: 'folder-1', folderName: 'Choir Recordings' };

/** A store of one recording, with the same read-then-write shape as the real one. */
const fakeStore = (initial: Recording) => {
  let current = initial;

  return {
    read: () => current,
    store: {
      modify: async (
        _id: string,
        patchFrom: (recording: Recording) => Partial<Recording>,
      ) => {
        current = { ...current, ...patchFrom(current) };
      },
    },
  };
};

describe('recordDriveExportDone and recordDriveExportFailure', () => {
  it('keeps a finished copy with its file, folder and time', async () => {
    const { read, store } = fakeStore(buildRecordingFixture());

    await recordDriveExportDone(store, 'rec-1', {
      file: { id: 'file-9', name: 'Song - Recording 1.wav' },
      folder: FOLDER,
      kind: 'recording',
      now: NOW,
    });

    assert.deepEqual(read().exports?.done, [
      {
        driveFileId: 'file-9',
        exportedAt: '2026-11-02T10:00:00.000Z',
        fileName: 'Song - Recording 1.wav',
        folderId: 'folder-1',
        folderName: 'Choir Recordings',
        kind: 'recording',
      },
    ]);
  });

  it('keeps a failure until the kind is exported, then drops it', async () => {
    const { read, store } = fakeStore(buildRecordingFixture());

    await recordDriveExportFailure(store, 'rec-1', {
      kind: 'mix',
      now: NOW,
      reason: 'original',
    });
    assert.deepEqual(
      read().exports?.failed.map((failure) => failure.reason),
      ['original'],
    );

    await recordDriveExportDone(store, 'rec-1', {
      file: { id: 'f', name: 'x.wav' },
      folder: FOLDER,
      kind: 'mix',
      now: NOW,
    });
    assert.deepEqual(read().exports?.failed, []);
  });
});
