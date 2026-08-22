import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createDriveAudioSource } from '@org/audio-library-models';

import {
  DEFAULT_SAVED_SOURCE_SORT_STATE,
  sortSavedSourcesBy,
} from './browse-source-group-model';

const buildSource = (
  overrides: Partial<Parameters<typeof createDriveAudioSource>[0]> & {
    driveFileId: string;
    name: string;
  },
) => {
  return createDriveAudioSource({
    availability: { status: 'available' },
    mimeType: 'audio/mpeg',
    ...overrides,
  });
};

describe('sortSavedSourcesBy', () => {
  const alto = buildSource({
    driveFileId: 'alto',
    modifiedTime: '2026-01-05T00:00:00.000Z',
    name: 'Alto Warmup',
  });
  const bass = buildSource({
    driveFileId: 'bass',
    modifiedTime: '2026-01-01T00:00:00.000Z',
    name: 'Bass Section',
  });
  const zebra = buildSource({
    driveFileId: 'zebra',
    modifiedTime: '2026-01-10T00:00:00.000Z',
    name: 'zebra crossing',
  });
  const sources = [alto, bass, zebra];

  it('defaults to name ascending', () => {
    assert.deepEqual(DEFAULT_SAVED_SOURCE_SORT_STATE, {
      direction: 'asc',
      field: 'name',
    });
  });

  it('sorts by name ascending case-insensitively', () => {
    assert.deepEqual(
      sortSavedSourcesBy(sources, { direction: 'asc', field: 'name' }),
      [alto, bass, zebra],
    );
  });

  it('sorts by name descending case-insensitively', () => {
    assert.deepEqual(
      sortSavedSourcesBy(sources, { direction: 'desc', field: 'name' }),
      [zebra, bass, alto],
    );
  });

  it('sorts by date added ascending using modifiedTime', () => {
    assert.deepEqual(
      sortSavedSourcesBy(sources, { direction: 'asc', field: 'date' }),
      [bass, alto, zebra],
    );
  });

  it('sorts by date added descending using modifiedTime', () => {
    assert.deepEqual(
      sortSavedSourcesBy(sources, { direction: 'desc', field: 'date' }),
      [zebra, alto, bass],
    );
  });

  it('treats a missing modifiedTime as the oldest possible date', () => {
    const undated = buildSource({
      driveFileId: 'undated',
      modifiedTime: undefined,
      name: 'Undated Track',
    });

    assert.deepEqual(
      sortSavedSourcesBy([alto, undated], {
        direction: 'asc',
        field: 'date',
      }),
      [undated, alto],
    );
  });

  it('does not mutate the input array', () => {
    const original = [...sources];

    sortSavedSourcesBy(sources, { direction: 'desc', field: 'name' });

    assert.deepEqual(sources, original);
  });
});
