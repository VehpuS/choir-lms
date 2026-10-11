import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  appendRefsToPlaylist,
  buildPlaylistFromRefs,
} from './bulk-playlist-actions.js';

const NOW = '2026-10-11T10:00:00.000Z';
const saved = { savedLoops: [SAVED_LOOP], savedSources: [PLAYABLE_SOURCE] };
const refs = [
  { entityId: PLAYABLE_SOURCE.id, kind: 'track' as const },
  { entityId: SAVED_LOOP.id, kind: 'loop' as const },
  { entityId: PLAYABLE_SOURCE.id, kind: 'track' as const },
];

describe('appendRefsToPlaylist', () => {
  it('appends entries after the existing ones, in order, repeats included', () => {
    const playlist = createPlaylist({
      createdAt: NOW,
      name: 'Set',
      ownerId: 'user-1',
    });
    const withOne = appendRefsToPlaylist({
      now: NOW,
      playlist,
      refs: refs.slice(0, 1),
      ...saved,
    }).playlist;
    const result = appendRefsToPlaylist({
      now: NOW,
      playlist: withOne ?? playlist,
      refs,
      ...saved,
    });

    assert.deepEqual(
      result.playlist?.items.map(({ kind, sortIndex }) => [kind, sortIndex]),
      [
        ['track', 0],
        ['track', 1],
        ['loop', 2],
        ['track', 3],
      ],
    );
    assert.equal(new Set(result.playlist?.items.map(({ id }) => id)).size, 4);
  });

  it('counts refs that are no longer saved instead of adding them', () => {
    const playlist = createPlaylist({
      createdAt: NOW,
      name: 'Set',
      ownerId: 'user-1',
    });
    const result = appendRefsToPlaylist({
      now: NOW,
      playlist,
      refs: [
        { entityId: 'gone', kind: 'track' },
        { entityId: 'gone-loop', kind: 'loop' },
        refs[0],
      ],
      ...saved,
    });

    assert.equal(result.missingCount, 2);
    assert.equal(result.playlist?.items.length, 1);
  });
});

describe('buildPlaylistFromRefs', () => {
  it('creates one named playlist whose entries are the refs in order', () => {
    const result = buildPlaylistFromRefs({
      name: 'Advent set',
      now: NOW,
      ownerId: 'user-1',
      refs,
      ...saved,
    });

    assert.equal(result.playlist?.name, 'Advent set');
    assert.equal(result.playlist?.items.length, 3);
    assert.equal(result.issue, null);
  });

  it('rejects an empty name like creating a playlist elsewhere', () => {
    const result = buildPlaylistFromRefs({
      name: '   ',
      ownerId: 'user-1',
      refs,
      ...saved,
    });

    assert.equal(result.playlist, null);
    assert.ok(result.issue);
  });
});
