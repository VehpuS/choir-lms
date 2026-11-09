import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { CompositeTrack } from '@org/audio-library-models';

import {
  buildCompositeLibraryRow,
  buildCompositeLibraryRows,
  compositeMatchesQuery,
  resolveCompositesNoResultsMessage,
} from './composites-library-model';

const stem = (id: string, name: string): CompositeTrack['stems'][number] => ({
  id,
  trackId: `t-${id}`,
  name,
  offsetMs: 0,
  mine: false,
});
const composite = (
  id: string,
  name: string,
  stems = [stem('s', 'Soprano'), stem('a', 'Alto')],
) => ({ id, name, stems });

const track = (id: string, durationMs: number, available = true) => ({
  id,
  durationMs,
  availability: available
    ? ({ status: 'available' } as const)
    : ({ status: 'unavailable', reason: 'missing' } as const),
});
const everyStem = { sources: [track('t-s', 205_000), track('t-a', 200_000)] };

describe('buildCompositeLibraryRow', () => {
  it('shows the badge and the length of the longest stem when all stems play', () => {
    const row = buildCompositeLibraryRow(composite('c', 'Ubi'), everyStem);

    assert.equal(row.badge, 'Composite · 2 stems');
    assert.equal(row.meta, '3:25');
    assert.equal(row.state, 'playable');
    assert.equal(row.isPlayable, true);
  });

  it('notes missing stems but stays playable while one stem plays', () => {
    const row = buildCompositeLibraryRow(composite('c', 'Ubi'), {
      sources: [track('t-s', 205_000), track('t-a', 200_000, false)],
    });

    assert.equal(row.meta, '3:25 · 1 stem missing');
    assert.equal(row.state, 'partly-playable');
    assert.equal(row.isPlayable, true);
  });

  it('marks a composite whose stems are all gone as unavailable', () => {
    const row = buildCompositeLibraryRow(composite('c', 'Ubi'), {
      sources: [],
    });

    assert.equal(row.meta, 'Every stem is missing');
    assert.equal(row.isPlayable, false);
  });

  it('counts a single stem with the singular badge', () => {
    const row = buildCompositeLibraryRow(
      composite('c', 'Solo', [stem('s', 'Soprano')]),
      everyStem,
    );

    assert.equal(row.badge, 'Composite · 1 stem');
  });
});

describe('compositeMatchesQuery', () => {
  const ubi = composite('c', 'Ubi caritas');

  it('matches everything for a blank query', () => {
    assert.equal(compositeMatchesQuery(ubi, null), true);
    assert.equal(compositeMatchesQuery(ubi, '  '), true);
  });

  it('matches the name or a stem name, ignoring case', () => {
    assert.equal(compositeMatchesQuery(ubi, 'CARITAS'), true);
    assert.equal(compositeMatchesQuery(ubi, 'alto'), true);
    assert.equal(compositeMatchesQuery(ubi, 'tenor'), false);
  });
});

describe('buildCompositeLibraryRows', () => {
  it('filters by the query and sorts by name ignoring case', () => {
    const rows = buildCompositeLibraryRows({
      composites: [
        composite('b', 'locus iste'),
        composite('a', 'Ubi caritas'),
        composite('c', 'Ave verum'),
      ],
      library: everyStem,
      query: null,
    });

    assert.deepEqual(
      rows.map((row) => row.name),
      ['Ave verum', 'locus iste', 'Ubi caritas'],
    );
    assert.deepEqual(
      buildCompositeLibraryRows({
        composites: [composite('a', 'Ubi caritas'), composite('b', 'Locus')],
        library: everyStem,
        query: 'locus',
      }).map((row) => row.id),
      ['b'],
    );
  });
});

describe('resolveCompositesNoResultsMessage', () => {
  it('names the query when nothing matches and stays quiet otherwise', () => {
    assert.equal(
      resolveCompositesNoResultsMessage(' tenor ', 0),
      'No composites match “tenor”.',
    );
    assert.equal(resolveCompositesNoResultsMessage('tenor', 2), null);
    assert.equal(resolveCompositesNoResultsMessage(null, 0), null);
    assert.equal(resolveCompositesNoResultsMessage('  ', 0), null);
  });
});
