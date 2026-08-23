import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NamedLoop } from '@org/audio-library-models';

import {
  DEFAULT_SAVED_LOOP_SORT_STATE,
  sortSavedLoopsBy,
} from './saved-loop-sort-model';

const buildLoop = (overrides: Partial<NamedLoop> & { id: string }): NamedLoop => {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    endMs: 44000,
    name: 'Untitled loop',
    ownerId: 'user-1',
    sourceId: 'source-1',
    sourceName: 'Full Choir',
    startMs: 12000,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
};

describe('sortSavedLoopsBy', () => {
  const alto = buildLoop({
    createdAt: '2026-01-05T00:00:00.000Z',
    id: 'alto',
    name: 'Alto Warmup',
  });
  const bass = buildLoop({
    createdAt: '2026-01-01T00:00:00.000Z',
    id: 'bass',
    name: 'Bass Section',
  });
  const zebra = buildLoop({
    createdAt: '2026-01-10T00:00:00.000Z',
    id: 'zebra',
    name: 'zebra crossing',
  });
  const loops = [alto, bass, zebra];

  it('defaults to name ascending', () => {
    assert.deepEqual(DEFAULT_SAVED_LOOP_SORT_STATE, {
      direction: 'asc',
      field: 'name',
    });
  });

  it('sorts by name ascending case-insensitively', () => {
    assert.deepEqual(
      sortSavedLoopsBy(loops, { direction: 'asc', field: 'name' }),
      [alto, bass, zebra],
    );
  });

  it('sorts by name descending case-insensitively', () => {
    assert.deepEqual(
      sortSavedLoopsBy(loops, { direction: 'desc', field: 'name' }),
      [zebra, bass, alto],
    );
  });

  it('sorts by date added ascending using createdAt', () => {
    assert.deepEqual(
      sortSavedLoopsBy(loops, { direction: 'asc', field: 'date' }),
      [bass, alto, zebra],
    );
  });

  it('sorts by date added descending using createdAt', () => {
    assert.deepEqual(
      sortSavedLoopsBy(loops, { direction: 'desc', field: 'date' }),
      [zebra, alto, bass],
    );
  });

  it('breaks a date tie alphabetically by name', () => {
    const tiedAlto = buildLoop({
      createdAt: '2026-01-05T00:00:00.000Z',
      id: 'tied-alto',
      name: 'Alto Warmup',
    });
    const tiedBass = buildLoop({
      createdAt: '2026-01-05T00:00:00.000Z',
      id: 'tied-bass',
      name: 'Bass Section',
    });

    assert.deepEqual(
      sortSavedLoopsBy([tiedBass, tiedAlto], {
        direction: 'asc',
        field: 'date',
      }),
      [tiedAlto, tiedBass],
    );
  });

  it('does not mutate the input array', () => {
    const original = [...loops];

    sortSavedLoopsBy(loops, { direction: 'desc', field: 'name' });

    assert.deepEqual(loops, original);
  });
});
