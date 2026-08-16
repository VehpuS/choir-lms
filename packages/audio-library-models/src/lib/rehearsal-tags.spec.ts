import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { normalizeLibraryEntityTags } from './rehearsal-tags.ts';

describe('normalizeLibraryEntityTags', () => {
  it('trims whitespace, collapses internal spaces, and removes case-insensitive duplicates', () => {
    assert.deepEqual(
      normalizeLibraryEntityTags([
        ' Alto ',
        'Soprano',
        'alto',
        'Warm   up',
        ' ',
      ]),
      ['Alto', 'Soprano', 'Warm up'],
    );
  });

  it('returns an empty array when given no tags', () => {
    assert.deepEqual(normalizeLibraryEntityTags([]), []);
  });
});
