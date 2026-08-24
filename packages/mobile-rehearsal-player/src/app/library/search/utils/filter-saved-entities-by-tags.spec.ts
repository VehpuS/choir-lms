/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { NamedLoop } from '@org/audio-library-models';
import { createPlaylist } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
} from './saved-library-search-view-model.js';

const CREATED_AT = '2026-05-12T00:00:00.000Z';
const OWNER_ID = 'user-1';

const makeLoop = (
  overrides: Partial<NamedLoop> &
    Pick<NamedLoop, 'id' | 'name' | 'sourceId' | 'sourceName'>,
): NamedLoop => ({
  createdAt: CREATED_AT,
  endMs: 18000,
  ownerId: OWNER_ID,
  startMs: 12000,
  updatedAt: CREATED_AT,
  ...overrides,
});

const makePlaylist = (name: string, tags?: string[]) => ({
  ...createPlaylist({ createdAt: CREATED_AT, name, ownerId: OWNER_ID }),
  ...(tags ? { tags } : {}),
});

describe('filtering saved entities by tags', () => {
  it('filters tracks, loops, and playlists by one or more selected tags', () => {
    const sources = [
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:alto-line',
        name: 'Alto Line.mp3',
        tags: ['Alto', 'Warmup'],
      },
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:bass-line',
        name: 'Bass Line.mp3',
        tags: ['Bass'],
      },
    ];
    const loops = [
      makeLoop({
        id: 'loop-1',
        name: 'Alto entrance',
        sourceId: 'drive:alto-line',
        sourceName: 'Alto Line.mp3',
        tags: ['Alto', 'Warmup'],
      }),
      makeLoop({
        id: 'loop-2',
        name: 'Bass cadence',
        endMs: 47000,
        startMs: 35000,
        sourceId: 'drive:bass-line',
        sourceName: 'Bass Line.mp3',
        tags: ['Bass'],
      }),
    ];
    const playlists = [
      makePlaylist('Warmup Set', ['Warmup']),
      makePlaylist('Bass Focus', ['Bass']),
    ];

    assert.deepEqual(
      filterSavedLibrarySourcesByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        selectedTagFilters: ['alto', 'warmup'],
        sources,
        tagFilterMatchMode: 'all',
      }).map((s) => s.name),
      ['Alto Line.mp3'],
    );
    assert.deepEqual(
      filterSavedLoopsByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        loops,
        selectedTagFilters: ['bass'],
        sources,
        tagFilterMatchMode: 'all',
      }).map((l) => l.name),
      ['Bass cadence'],
    );
    assert.deepEqual(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        playlists,
        selectedTagFilters: ['warmup'],
        tagFilterMatchMode: 'all',
      }).map((p) => p.name),
      ['Warmup Set'],
    );
  });

  it('broadens tracks, loops, and playlists to any selected tag when match mode is any', () => {
    const sources = [
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:alto-line',
        name: 'Alto Line.mp3',
        tags: ['Alto'],
      },
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:bass-line',
        name: 'Bass Line.mp3',
        tags: ['Bass'],
      },
      {
        ...PLAYABLE_SOURCE,
        id: 'drive:tenor-line',
        name: 'Tenor Line.mp3',
        tags: ['Tenor'],
      },
    ];
    const loops = [
      makeLoop({
        id: 'loop-1',
        name: 'Alto entrance',
        sourceId: 'drive:alto-line',
        sourceName: 'Alto Line.mp3',
        tags: ['Alto'],
      }),
      makeLoop({
        id: 'loop-2',
        name: 'Bass cadence',
        endMs: 47000,
        startMs: 35000,
        sourceId: 'drive:bass-line',
        sourceName: 'Bass Line.mp3',
        tags: ['Bass'],
      }),
    ];
    const playlists = [
      makePlaylist('Alto Set', ['Alto']),
      makePlaylist('Bass Focus', ['Bass']),
    ];
    const selectedTagFilters = ['alto', 'bass'];

    assert.deepEqual(
      filterSavedLibrarySourcesByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        selectedTagFilters,
        sources,
        tagFilterMatchMode: 'all',
      }).map((s) => s.name),
      [],
    );
    assert.deepEqual(
      filterSavedLibrarySourcesByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        selectedTagFilters,
        sources,
        tagFilterMatchMode: 'any',
      })
        .map((s) => s.name)
        .sort(),
      ['Alto Line.mp3', 'Bass Line.mp3'],
    );
    assert.deepEqual(
      filterSavedLoopsByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        loops,
        selectedTagFilters,
        sources,
        tagFilterMatchMode: 'all',
      }).map((l) => l.name),
      [],
    );
    assert.deepEqual(
      filterSavedLoopsByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        loops,
        selectedTagFilters,
        sources,
        tagFilterMatchMode: 'any',
      })
        .map((l) => l.name)
        .sort(),
      ['Alto entrance', 'Bass cadence'],
    );
    assert.deepEqual(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        playlists,
        selectedTagFilters,
        tagFilterMatchMode: 'all',
      }).map((p) => p.name),
      [],
    );
    assert.deepEqual(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: null,
        entityFilter: 'all',
        playlists,
        selectedTagFilters,
        tagFilterMatchMode: 'any',
      })
        .map((p) => p.name)
        .sort(),
      ['Alto Set', 'Bass Focus'],
    );
  });
});
