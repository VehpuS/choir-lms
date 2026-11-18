import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listeningOwnerId } from '../../composite/prepared/prepared-owner';
import {
  buildPreparedListeningSummary,
  PREPARED_LISTENING_COPY,
} from './prepared-listening-model';

const MEGABYTE = 1024 * 1024;
const names = new Map([
  ['t1', 'Ubi caritas'],
  ['t2', 'Locus iste'],
]);
const nameOf = (trackId: string) => names.get(trackId);

describe('buildPreparedListeningSummary', () => {
  it('lists each prepared track by name, largest first, with the total', () => {
    const summary = buildPreparedListeningSummary(
      [
        {
          compositeId: listeningOwnerId('t1'),
          stemCount: 1,
          sizeBytes: 10 * MEGABYTE,
        },
        {
          compositeId: listeningOwnerId('t2'),
          stemCount: 1,
          sizeBytes: 30 * MEGABYTE,
        },
      ],
      nameOf,
    );

    assert.deepEqual(
      summary.rows.map((row) => row.name),
      ['Locus iste', 'Ubi caritas'],
    );
    assert.equal(summary.count, 2);
    assert.equal(summary.totalBytes, 40 * MEGABYTE);
    assert.match(summary.groupLine, /^40 MB · made again/);
  });

  it('leaves composites out', () => {
    const summary = buildPreparedListeningSummary(
      [{ compositeId: 'composite-1', stemCount: 4, sizeBytes: MEGABYTE }],
      nameOf,
    );

    assert.equal(summary.count, 0);
  });

  it('names a track that is no longer in the library', () => {
    const summary = buildPreparedListeningSummary(
      [
        {
          compositeId: listeningOwnerId('gone'),
          stemCount: 1,
          sizeBytes: MEGABYTE,
        },
      ],
      nameOf,
    );

    assert.equal(summary.rows[0].name, PREPARED_LISTENING_COPY.removedTrack);
  });
});
