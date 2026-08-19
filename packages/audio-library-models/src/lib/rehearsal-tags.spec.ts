import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeLibraryEntityTags,
  resolveTagAddedAt,
  withResolvedTagAddedAt,
} from './rehearsal-tags.ts';

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

describe('resolveTagAddedAt', () => {
  it('stamps a newly added tag with the fallback timestamp', () => {
    assert.deepEqual(
      resolveTagAddedAt(['Alto'], undefined, '2026-06-01T00:00:00.000Z'),
      { Alto: '2026-06-01T00:00:00.000Z' },
    );
  });

  it('preserves the recorded date for a tag that was already tracked', () => {
    assert.deepEqual(
      resolveTagAddedAt(
        ['Alto'],
        { Alto: '2026-01-01T00:00:00.000Z' },
        '2026-06-01T00:00:00.000Z',
      ),
      { Alto: '2026-01-01T00:00:00.000Z' },
    );
  });

  it('drops entries for tags that are no longer present', () => {
    assert.deepEqual(
      resolveTagAddedAt(
        ['Alto'],
        { Alto: '2026-01-01T00:00:00.000Z', Soprano: '2026-01-02T00:00:00.000Z' },
        '2026-06-01T00:00:00.000Z',
      ),
      { Alto: '2026-01-01T00:00:00.000Z' },
    );
  });

  it('returns undefined when there are no tags', () => {
    assert.equal(
      resolveTagAddedAt(undefined, { Alto: '2026-01-01T00:00:00.000Z' }, '2026-06-01T00:00:00.000Z'),
      undefined,
    );
    assert.equal(
      resolveTagAddedAt([], { Alto: '2026-01-01T00:00:00.000Z' }, '2026-06-01T00:00:00.000Z'),
      undefined,
    );
  });
});

describe('withResolvedTagAddedAt', () => {
  it('adds a tagAddedAt key when tags are present', () => {
    const entity = { id: 'source-1', tags: ['Alto'] };

    assert.deepEqual(
      withResolvedTagAddedAt(entity, undefined, '2026-06-01T00:00:00.000Z'),
      { id: 'source-1', tags: ['Alto'], tagAddedAt: { Alto: '2026-06-01T00:00:00.000Z' } },
    );
  });

  it('omits the tagAddedAt key entirely when there are no tags, even if a stale entry existed', () => {
    const entity = {
      id: 'source-1',
      tags: [],
      tagAddedAt: { Alto: '2026-01-01T00:00:00.000Z' },
    };
    const result = withResolvedTagAddedAt(
      entity,
      entity.tagAddedAt,
      '2026-06-01T00:00:00.000Z',
    );

    assert.deepEqual(result, { id: 'source-1', tags: [] });
    assert.equal('tagAddedAt' in result, false);
  });

  it('does not mutate the input entity', () => {
    const entity = { id: 'source-1', tags: ['Alto'] };

    withResolvedTagAddedAt(entity, undefined, '2026-06-01T00:00:00.000Z');

    assert.equal('tagAddedAt' in entity, false);
  });
});
