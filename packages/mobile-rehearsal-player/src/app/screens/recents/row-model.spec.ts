import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import {
  buildRecentRehearsalItem,
  type RecentRehearsalKind,
} from './history.js';
import {
  getRecentItemCountLabel,
  getRecentRowMeta,
  getRecentRowPresentation,
} from './row-model.js';

const PLAYED_AT = '2026-06-01T09:00:00.000Z';
const TWO_HOURS_LATER = new Date('2026-06-01T11:00:00.000Z');

const buildRecent = (kind: RecentRehearsalKind) => {
  return {
    ...buildRecentRehearsalItem({
      activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
      activePlaylistSession: null,
      playedAt: PLAYED_AT,
    }),
    kind,
  };
};

describe('recents row model', () => {
  it('gives each kind its own outlined glyph', () => {
    assert.deepEqual(
      getRecentRowPresentation({ isPlaying: false, kind: 'track' }),
      { iconName: 'music-note-outline', tileTone: 'outline' },
    );
    assert.deepEqual(
      getRecentRowPresentation({ isPlaying: false, kind: 'loop' }),
      { iconName: 'repeat', tileTone: 'outline' },
    );
    assert.deepEqual(
      getRecentRowPresentation({ isPlaying: false, kind: 'playlist' }),
      { iconName: 'playlist-music-outline', tileTone: 'outline' },
    );
  });

  it('marks the playing row with the waveform glyph on the accent tile', () => {
    assert.deepEqual(
      getRecentRowPresentation({ isPlaying: true, kind: 'loop' }),
      { iconName: 'waveform', tileTone: 'active' },
    );
  });

  it('shows when a track was last played and its duration', () => {
    assert.equal(
      getRecentRowMeta({
        isPlaying: false,
        now: TWO_HOURS_LATER,
        recentRehearsal: buildRecent('track'),
      }),
      'Last played 2 hr ago · 3:05',
    );
  });

  it('leads loop and playlist meta with the kind', () => {
    assert.equal(
      getRecentRowMeta({
        isPlaying: false,
        now: TWO_HOURS_LATER,
        recentRehearsal: buildRecent('loop'),
      }),
      'Loop · Last played 2 hr ago',
    );
    assert.equal(
      getRecentRowMeta({
        isPlaying: false,
        now: TWO_HOURS_LATER,
        recentRehearsal: buildRecent('playlist'),
      }),
      'Playlist · Last played 2 hr ago',
    );
  });

  it('says the playing row is playing now instead of when it was last played', () => {
    assert.equal(
      getRecentRowMeta({
        isPlaying: true,
        now: TWO_HOURS_LATER,
        recentRehearsal: buildRecent('track'),
      }),
      'Playing now · 3:05',
    );
  });

  it('counts recent items with singular and plural labels', () => {
    assert.equal(getRecentItemCountLabel(1), '1 item');
    assert.equal(getRecentItemCountLabel(5), '5 items');
  });
});
