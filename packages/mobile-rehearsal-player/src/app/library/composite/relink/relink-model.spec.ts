import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';

import { resolveRelinkOptions } from './relink-model';

const track = (
  id: string,
  name: string,
  status: 'available' | 'missing' = 'available',
) => ({ id, name, availability: { status } }) as unknown as DriveAudioSource;

const composite = {
  stems: [
    { id: 's1', trackId: 'a' },
    { id: 's2', trackId: 'gone' },
  ],
} as never;

describe('resolveRelinkOptions', () => {
  const tracks = [
    track('a', 'Alto'),
    track('b', 'Tenor'),
    track('c', 'Bass'),
    track('d', 'Soprano', 'missing'),
  ];

  it('lists available tracks no other stem uses, sorted by name', () => {
    const names = resolveRelinkOptions({
      composite,
      query: '',
      stemId: 's2',
      tracks,
    }).map((option) => option.name);

    assert.deepEqual(names, ['Bass', 'Tenor']);
  });

  it('offers the stem its own current track', () => {
    const ids = resolveRelinkOptions({
      composite,
      query: '',
      stemId: 's1',
      tracks,
    }).map((option) => option.trackId);

    assert.ok(ids.includes('a'));
  });

  it('filters by the typed query, ignoring case and spaces around it', () => {
    const options = resolveRelinkOptions({
      composite,
      query: '  TEN ',
      stemId: 's2',
      tracks,
    });

    assert.deepEqual(
      options.map((option) => option.trackId),
      ['b'],
    );
  });
});
