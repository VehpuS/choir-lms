import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Recording } from '@org/audio-library-models';

import { formatByteSize } from '../offline/format-byte-size.js';
import {
  RECORDINGS_STORAGE_COPY,
  buildRecordingsStorageSummary,
  getDeleteRecordingConfirmation,
} from './recordings-storage-model.js';

const recording = (
  id: string,
  sizeBytes: number,
  createdAt: string,
): Recording =>
  ({
    id,
    name: `Take ${id}`,
    createdAt,
    sizeBytes,
    lineage: { track: { id: 't', driveFileId: 'd', name: 'Ave Verum' } },
  }) as Recording;

const recordings = [
  recording('1', 5 * 1024 * 1024, '2026-01-01'),
  recording('2', 56 * 1024 * 1024, '2026-01-03'),
  recording('3', 300 * 1024, '2026-01-02'),
];

describe('buildRecordingsStorageSummary', () => {
  it('totals the size and words the never-removed line for the group', () => {
    const summary = buildRecordingsStorageSummary(recordings);

    assert.equal(summary.count, 3);
    const total = formatByteSize((5 * 1024 + 56 * 1024 + 300) * 1024);

    assert.equal(summary.totalLabel, total);
    assert.equal(
      summary.groupLine,
      `${total} · recordings are never removed automatically`,
    );
  });

  it('orders by most recent or by size, with the track name from the recording', () => {
    assert.deepEqual(
      buildRecordingsStorageSummary(recordings, 'recent').rows.map((r) => r.id),
      ['2', '3', '1'],
    );
    assert.deepEqual(
      buildRecordingsStorageSummary(recordings, 'size').rows.map((r) => r.id),
      ['2', '1', '3'],
    );
    assert.equal(
      buildRecordingsStorageSummary(recordings).rows[0]?.trackName,
      'Ave Verum',
    );
  });

  it('is empty and zero without recordings', () => {
    const summary = buildRecordingsStorageSummary([]);

    assert.equal(summary.count, 0);
    assert.equal(summary.totalBytes, 0);
    assert.deepEqual(summary.rows, []);
  });
});

describe('getDeleteRecordingConfirmation', () => {
  it('names the recording, says it frees space, and that Drive copies stay', () => {
    const [row] = buildRecordingsStorageSummary(recordings).rows;
    const content = getDeleteRecordingConfirmation(
      row as NonNullable<typeof row>,
    );

    assert.equal(content.confirmLabel, RECORDINGS_STORAGE_COPY.deleteLabel);
    assert.match(content.title, /Take 2/);
    assert.ok(
      content.message.includes(`frees ${formatByteSize(56 * 1024 * 1024)}`),
    );
    assert.match(content.message, /Drive are not deleted/);
  });
});
