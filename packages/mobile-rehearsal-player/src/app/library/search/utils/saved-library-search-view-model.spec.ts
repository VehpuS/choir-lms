/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
  resolveActiveLibrarySearchQuery,
  resolveSearchHighlightParts,
} from './saved-library-search-view-model.js';

describe('saved library search view-model', () => {
  it('normalizes an active library search query from user input', () => {
    assert.equal(resolveActiveLibrarySearchQuery('  Kyrie  '), 'Kyrie');
    assert.equal(resolveActiveLibrarySearchQuery('   '), null);
  });

  it('filters saved entities by the active library query', () => {
    const sources = [
      PLAYABLE_SOURCE,
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:bass-line',
        name: 'Bass Line.mp3',
      },
    ];
    const loops = [
      {
        createdAt: '2026-05-12T00:00:00.000Z',
        endMs: 18000,
        id: 'loop-1',
        name: 'Entrance cue',
        ownerId: 'user-1',
        ownershipScope: 'user' as const,
        sourceId: PLAYABLE_SOURCE.id,
        sourceName: PLAYABLE_SOURCE.name,
        startMs: 12000,
        updatedAt: '2026-05-12T00:00:00.000Z',
      },
      {
        createdAt: '2026-05-12T00:00:00.000Z',
        endMs: 47000,
        id: 'loop-2',
        name: 'Bass cadence',
        ownerId: 'user-1',
        ownershipScope: 'user' as const,
        sourceId: 'drive:bass-line',
        sourceName: 'Bass Line.mp3',
        startMs: 35000,
        updatedAt: '2026-05-12T00:00:00.000Z',
      },
    ];
    const playlists = [
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Kyrie Warmups',
        ownerId: 'user-1',
      }),
      createPlaylist({
        createdAt: '2026-05-12T00:00:00.000Z',
        name: 'Bass Focus',
        ownerId: 'user-1',
      }),
    ];

    assert.deepEqual(
      filterSavedLibrarySourcesByQuery({
        activeSearchQuery: 'bass',
        sources,
      }).map((source) => source.name),
      ['Bass Line.mp3'],
    );
    assert.deepEqual(
      filterSavedLoopsByQuery({
        activeSearchQuery: 'bass',
        loops,
      }).map((loop) => loop.name),
      ['Bass cadence'],
    );
    assert.deepEqual(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: 'kyrie',
        playlists,
      }).map((playlist) => playlist.name),
      ['Kyrie Warmups'],
    );
  });

  it('returns highlight fragments for repeated case-insensitive matches', () => {
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'ky',
        text: 'Kyrie Kyrie',
      }),
      [
        {
          isHighlighted: true,
          text: 'Ky',
        },
        {
          isHighlighted: false,
          text: 'rie ',
        },
        {
          isHighlighted: true,
          text: 'Ky',
        },
        {
          isHighlighted: false,
          text: 'rie',
        },
      ],
    );
  });

  it('highlights loop metadata only when the visible source label matches the active query', () => {
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'alto',
        text: 'Alto Line.mp3 • 0:12 to 0:18',
      }),
      [
        {
          isHighlighted: true,
          text: 'Alto',
        },
        {
          isHighlighted: false,
          text: ' Line.mp3 • 0:12 to 0:18',
        },
      ],
    );
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'alto',
        text: 'Bass Line.mp3 • 0:12 to 0:18',
      }),
      [
        {
          isHighlighted: false,
          text: 'Bass Line.mp3 • 0:12 to 0:18',
        },
      ],
    );
  });
});
