/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createPlaylist, type NamedLoop } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import {
  filterSavedLibrarySourcesByQuery,
  filterSavedLoopsByQuery,
  filterSavedPlaylistsByQuery,
  resolveActiveLibrarySearchQuery,
  resolveSearchHighlightParts,
  resolveTagFilterMatchModeToggleLabel,
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

describe('saved library search view-model', () => {
  it('normalizes an active library search query from user input', () => {
    assert.equal(resolveActiveLibrarySearchQuery('  Kyrie  '), 'Kyrie');
    assert.equal(resolveActiveLibrarySearchQuery('   '), null);
  });

  it('filters saved entities by the active library query', () => {
    const sources = [
      PLAYABLE_SOURCE,
      { ...PLAYABLE_SOURCE, id: 'drive:bass-line', name: 'Bass Line.mp3' },
    ];
    const loops = [
      makeLoop({
        id: 'loop-1',
        name: 'Entrance cue',
        sourceId: PLAYABLE_SOURCE.id,
        sourceName: PLAYABLE_SOURCE.name,
      }),
      makeLoop({
        id: 'loop-2',
        name: 'Bass cadence',
        endMs: 47000,
        startMs: 35000,
        sourceId: 'drive:bass-line',
        sourceName: 'Bass Line.mp3',
      }),
    ];
    const playlists = [
      makePlaylist('Kyrie Warmups'),
      makePlaylist('Bass Focus'),
    ];

    assert.deepEqual(
      filterSavedLibrarySourcesByQuery({
        activeSearchQuery: 'bass',
        entityFilter: 'all',
        selectedTagFilters: [],
        sources,
        tagFilterMatchMode: 'all',
      }).map((s) => s.name),
      ['Bass Line.mp3'],
    );
    assert.deepEqual(
      filterSavedLoopsByQuery({
        activeSearchQuery: 'bass',
        entityFilter: 'all',
        loops,
        selectedTagFilters: [],
        sources,
        tagFilterMatchMode: 'all',
      }).map((l) => l.name),
      ['Bass cadence'],
    );
    assert.deepEqual(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: 'kyrie',
        entityFilter: 'all',
        playlists,
        selectedTagFilters: [],
        tagFilterMatchMode: 'all',
      }).map((p) => p.name),
      ['Kyrie Warmups'],
    );
  });

  it('supports entity filters for library search results without hiding unavailable items', () => {
    const unavailableSource = {
      ...PLAYABLE_SOURCE,
      availability: {
        message: 'Saved file is no longer playable.',
        reason: 'missing' as const,
        status: 'unavailable' as const,
      },
      id: 'drive:tenor-line',
      name: 'Tenor Line.mp3',
    };
    const sources = [PLAYABLE_SOURCE, unavailableSource];
    const loops = [
      makeLoop({
        id: 'loop-1',
        name: 'Alto entrance',
        sourceId: PLAYABLE_SOURCE.id,
        sourceName: PLAYABLE_SOURCE.name,
      }),
      makeLoop({
        id: 'loop-2',
        name: 'Tenor cadence',
        endMs: 47000,
        startMs: 35000,
        sourceId: 'drive:tenor-line',
        sourceName: 'Tenor Line.mp3',
      }),
    ];
    const playlists = [makePlaylist('Tenor Focus')];

    assert.deepEqual(
      filterSavedLibrarySourcesByQuery({
        activeSearchQuery: 'tenor',
        entityFilter: 'tracks',
        selectedTagFilters: [],
        sources,
        tagFilterMatchMode: 'all',
      }).map((s) => s.name),
      ['Tenor Line.mp3'],
    );
    assert.deepEqual(
      filterSavedLoopsByQuery({
        activeSearchQuery: 'tenor',
        entityFilter: 'loops',
        loops,
        selectedTagFilters: [],
        sources,
        tagFilterMatchMode: 'all',
      }).map((l) => l.name),
      ['Tenor cadence'],
    );
    assert.deepEqual(
      filterSavedPlaylistsByQuery({
        activeSearchQuery: 'tenor',
        entityFilter: 'playlists',
        playlists,
        selectedTagFilters: [],
        tagFilterMatchMode: 'all',
      }).map((p) => p.name),
      ['Tenor Focus'],
    );
  });

  it('returns highlight fragments for repeated case-insensitive matches', () => {
    assert.deepEqual(
      resolveSearchHighlightParts({ query: 'ky', text: 'Kyrie Kyrie' }),
      [
        { isHighlighted: true, text: 'Ky' },
        { isHighlighted: false, text: 'rie ' },
        { isHighlighted: true, text: 'Ky' },
        { isHighlighted: false, text: 'rie' },
      ],
    );
  });

  it('highlights loop metadata only when the visible source label matches the active query', () => {
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'alto',
        text: 'Alto Line.mp3 \u2022 0:12 to 0:18',
      }),
      [
        { isHighlighted: true, text: 'Alto' },
        { isHighlighted: false, text: ' Line.mp3 \u2022 0:12 to 0:18' },
      ],
    );
    assert.deepEqual(
      resolveSearchHighlightParts({
        query: 'alto',
        text: 'Bass Line.mp3 \u2022 0:12 to 0:18',
      }),
      [{ isHighlighted: false, text: 'Bass Line.mp3 \u2022 0:12 to 0:18' }],
    );
  });

  it('resolves the tag match-mode toggle label for the current mode', () => {
    assert.equal(resolveTagFilterMatchModeToggleLabel('all'), 'Match: All');
    assert.equal(resolveTagFilterMatchModeToggleLabel('any'), 'Match: Any');
  });
});
