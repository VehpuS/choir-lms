import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPreparedCompositesSummary } from './prepared-composites-model';

describe('buildPreparedCompositesSummary', () => {
  it('names each composite, biggest first, with the total in the group line', () => {
    const summary = buildPreparedCompositesSummary(
      [
        { compositeId: 'c1', stemCount: 1, sizeBytes: 1_000_000 },
        { compositeId: 'c2', stemCount: 4, sizeBytes: 4_000_000 },
      ],
      [
        { id: 'c1', name: 'Kyrie' },
        { id: 'c2', name: 'Ubi caritas' },
      ],
    );

    assert.deepEqual(
      summary.rows.map(({ name, stemsLabel }) => [name, stemsLabel]),
      [
        ['Ubi caritas', '4 stems'],
        ['Kyrie', '1 stem'],
      ],
    );
    assert.equal(summary.count, 2);
    assert.equal(summary.totalBytes, 5_000_000);
    assert.match(
      summary.groupLine,
      /made again when a composite is next played/,
    );
  });

  it('shows prepared audio of a composite that no longer exists', () => {
    const summary = buildPreparedCompositesSummary(
      [{ compositeId: 'gone', stemCount: 2, sizeBytes: 10 }],
      [],
    );

    assert.equal(summary.rows[0].name, 'Deleted composite');
  });

  it('is empty without prepared stems', () => {
    const summary = buildPreparedCompositesSummary([], []);

    assert.equal(summary.count, 0);
    assert.equal(summary.totalBytes, 0);
  });
});
