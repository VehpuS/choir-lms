import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseLibraryBundle, type Recording } from '@org/audio-library-models';

import { buildLibraryBundle } from './library-bundle-builder.ts';
import {
  AT,
  AUTHOR,
  input,
  OUTSIDE,
  SOPRANO,
} from './library-bundle-test-fixtures.ts';

const recording = (
  id: string,
  lineage: Recording['lineage'],
  overrides: Partial<Recording> = {},
): Recording => ({
  id,
  name: `Take ${id.length}`,
  createdAt: AT,
  durationMs: 10_000,
  sampleRate: 44_100,
  sizeBytes: 1_000,
  appliedLatencyMs: 0,
  nudgeMs: 0,
  source: { driveFileId: 'd-sop', name: 'Soprano' },
  lineage,
  shaping: { rate: 1, pitchSemitones: 0 },
  balance: 50,
  engineVersion: 1,
  markers: [],
  timeline: [],
  ...overrides,
});

describe('buildLibraryBundle recordings', () => {
  const onTrack = recording('rec-a', {
    track: { id: SOPRANO.id, driveFileId: 'd-sop', name: 'Soprano' },
  });
  const onDrive = recording(
    'rec-b',
    { track: { id: SOPRANO.id, driveFileId: 'd-sop', name: 'Soprano' } },
    {
      sizeBytes: 5_000,
      exports: {
        done: [
          {
            kind: 'recording',
            driveFileId: 'd-rec',
            fileName: 'rec-b.webm',
            folderId: 'f',
            folderName: 'Recordings',
            exportedAt: AT,
          },
        ],
        failed: [],
      },
    },
  );
  const elsewhere = recording('rec-c', {
    track: { id: OUTSIDE.id, driveFileId: 'd-out', name: 'Elsewhere' },
  });
  const all = [onTrack, onDrive, elsewhere];
  const withRecordings = (selected: string[], folder?: string) =>
    buildLibraryBundle({
      input: input(),
      scope: folder
        ? { kind: 'folder', folderId: folder }
        : { kind: 'library' },
      author: AUTHOR,
      createdAt: AT,
      recordings: all,
      selectedRecordingIds: new Set(selected),
    });

  it('leaves recordings out unless they are selected', () => {
    const result = buildLibraryBundle({
      input: input(),
      scope: { kind: 'library' },
      author: AUTHOR,
      createdAt: AT,
      recordings: all,
    });

    assert.equal(result.bundle.recordings, undefined);
    assert.equal(result.uploadSizeBytes, 0);
  });

  it('references an existing Drive copy and uploads nothing for it', () => {
    const result = withRecordings(['rec-b']);

    assert.deepEqual(result.bundle.recordings?.[0].audio, {
      kind: 'drive',
      driveFileId: 'd-rec',
      fileName: 'rec-b.webm',
    });
    assert.deepEqual(result.recordingsToUpload, []);
    assert.equal(result.uploadSizeBytes, 0);
  });

  it('marks audio without a Drive copy for upload and totals its size', () => {
    const result = withRecordings(['rec-a', 'rec-b']);

    assert.deepEqual(result.bundle.recordings?.[0].audio, {
      kind: 'not-uploaded',
    });
    assert.deepEqual(result.recordingsToUpload, [
      { id: 'r1', recordingId: 'rec-a', sizeBytes: 1_000 },
    ]);
    assert.equal(result.uploadSizeBytes, 1_000);
  });

  it('re-keys the lineage and leaves no library id behind', () => {
    const result = withRecordings(['rec-a']);
    const text = JSON.stringify(result.bundle.recordings);

    assert.deepEqual(result.bundle.recordings?.[0].lineage, { trackId: 's1' });
    assert.equal(text.includes(SOPRANO.id), false);
    assert.equal(text.includes('rec-a'), false);
    assert.equal(
      parseLibraryBundle(JSON.stringify(result.bundle)).status,
      'ok',
    );
  });

  it('skips a selected recording whose track is outside the folder', () => {
    const result = withRecordings(['rec-a', 'rec-c'], 'folder:messiah');

    assert.equal(result.bundle.recordings?.length, 1);
    assert.deepEqual(result.bundle.recordings?.[0].lineage, { trackId: 's1' });
  });
});
