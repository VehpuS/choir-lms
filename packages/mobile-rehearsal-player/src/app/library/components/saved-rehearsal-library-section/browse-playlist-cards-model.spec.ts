import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Playlist } from '@org/audio-library-models';

import { resolveSavedPlaylistCards } from '../../playlists/utils/saved-playlist-card-view-model';
import {
  DEFAULT_SAVED_PLAYLIST_SORT_STATE,
  sortSavedPlaylistsBy,
} from './browse-playlist-cards-model';

const buildPlaylist = (
  overrides: Partial<Playlist> & { id: string; name: string },
): Playlist => {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    items: [],
    ownerId: 'user-1',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
};

describe('sortSavedPlaylistsBy', () => {
  const [altoCard, bassCard, zebraCard] = resolveSavedPlaylistCards([
    buildPlaylist({
      createdAt: '2026-01-05T00:00:00.000Z',
      id: 'alto',
      name: 'Alto Warmup',
    }),
    buildPlaylist({
      createdAt: '2026-01-01T00:00:00.000Z',
      id: 'bass',
      name: 'Bass Section',
    }),
    buildPlaylist({
      createdAt: '2026-01-10T00:00:00.000Z',
      id: 'zebra',
      name: 'zebra crossing',
    }),
  ]);
  const playlistCards = [altoCard, bassCard, zebraCard];

  it('defaults to name ascending', () => {
    assert.deepEqual(DEFAULT_SAVED_PLAYLIST_SORT_STATE, {
      direction: 'asc',
      field: 'name',
    });
  });

  it('sorts by name ascending case-insensitively', () => {
    assert.deepEqual(
      sortSavedPlaylistsBy(playlistCards, { direction: 'asc', field: 'name' }),
      [altoCard, bassCard, zebraCard],
    );
  });

  it('sorts by name descending case-insensitively', () => {
    assert.deepEqual(
      sortSavedPlaylistsBy(playlistCards, {
        direction: 'desc',
        field: 'name',
      }),
      [zebraCard, bassCard, altoCard],
    );
  });

  it('sorts by date added ascending using playlist.createdAt', () => {
    assert.deepEqual(
      sortSavedPlaylistsBy(playlistCards, { direction: 'asc', field: 'date' }),
      [bassCard, altoCard, zebraCard],
    );
  });

  it('sorts by date added descending using playlist.createdAt', () => {
    assert.deepEqual(
      sortSavedPlaylistsBy(playlistCards, {
        direction: 'desc',
        field: 'date',
      }),
      [zebraCard, altoCard, bassCard],
    );
  });

  it('breaks a date tie alphabetically by name', () => {
    const [tiedAltoCard, tiedBassCard] = resolveSavedPlaylistCards([
      buildPlaylist({
        createdAt: '2026-01-05T00:00:00.000Z',
        id: 'tied-alto',
        name: 'Alto Warmup',
      }),
      buildPlaylist({
        createdAt: '2026-01-05T00:00:00.000Z',
        id: 'tied-bass',
        name: 'Bass Section',
      }),
    ]);

    assert.deepEqual(
      sortSavedPlaylistsBy([tiedBassCard, tiedAltoCard], {
        direction: 'asc',
        field: 'date',
      }),
      [tiedAltoCard, tiedBassCard],
    );
  });

  it('does not mutate the input array', () => {
    const original = [...playlistCards];

    sortSavedPlaylistsBy(playlistCards, { direction: 'desc', field: 'name' });

    assert.deepEqual(playlistCards, original);
  });
});
