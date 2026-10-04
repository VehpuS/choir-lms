import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAdjustedLoop,
  createAdjustedTrackSource,
  createDriveAudioSource,
  createLoopPlayableItem,
  createPlaylistEntryFromLoop,
  createPlaylistEntryFromTrack,
  createTrackPlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';

import { getRecentRowMeta } from '../../screens/recents/row-model';
import { buildRecentRehearsalItem } from '../../screens/recents/history';
import { getQueueItemDetail } from '../../routing/shell/shell-playback-summary-model';
import { getTagMatchMetadataLabel } from '../tags/components/tag-match-list/model';
import { getSavedPlaylistEntryDetailLabel } from '../playlists/utils/saved-playlist-view-model';
import { formatSavedLoopParentTrackLabel } from '../loops/utils/saved-loop-view-model';

// Adjusted entities show their transform, their source, and a duration scaled
// by speed in every list that names a track or loop (mobile-library-organization).
const transform = {
  pitchSemitones: 2,
  speedMultiplier: 0.5,
  tempoSource: 'multiplier' as const,
};
const source = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'file-1',
  durationMs: 120_000,
  mimeType: 'audio/mpeg',
  name: 'Kyrie.mp3',
});
const adjustedTrack = createAdjustedTrackSource({ source, transform });
const adjustedLoop = createAdjustedLoop({
  id: 'loop-1',
  name: 'Entrance',
  ownerId: 'owner',
  source,
  startMs: 10_000,
  endMs: 20_000,
  transform,
});
const PLAYED_AT = '2026-10-04T10:00:00.000Z';
const NOW = new Date('2026-10-04T12:00:00.000Z');

describe('adjusted entities in queue rows', () => {
  it('shows an adjusted track its kind, transform and scaled duration', () => {
    assert.equal(
      getQueueItemDetail(createTrackPlayableItem(adjustedTrack)),
      'Adjusted track · 0.50× +2 st · 4:00',
    );
    assert.equal(
      getQueueItemDetail(createTrackPlayableItem(source)),
      'Track · 2:00',
    );
  });

  it('shows an adjusted loop its range, transform and source', () => {
    assert.equal(
      getQueueItemDetail(createLoopPlayableItem(adjustedLoop, source)),
      'Loop · 0:10–0:20 · 0.50× +2 st · Kyrie.mp3',
    );
  });
});

describe('adjusted entities in playlist rows', () => {
  it('describes an adjusted track entry with its transform, duration and source', () => {
    assert.equal(
      getSavedPlaylistEntryDetailLabel({
        entry: createPlaylistEntryFromTrack(adjustedTrack, PLAYED_AT),
        savedLoops: [],
        savedSources: [source, adjustedTrack],
      }),
      'Adjusted track • 0.50× +2 st • 4:00 • Kyrie.mp3',
    );
  });

  it('describes an adjusted loop entry with its transform', () => {
    assert.equal(
      getSavedPlaylistEntryDetailLabel({
        entry: createPlaylistEntryFromLoop(adjustedLoop, PLAYED_AT),
        savedLoops: [adjustedLoop],
        savedSources: [source],
      }),
      'Loop • 0:10–0:20 • 0.50× +2 st • Kyrie.mp3',
    );
  });
});

describe('adjusted entities in tag and loop lists', () => {
  it('leads tag-match metadata with the transform and scales the duration', () => {
    assert.equal(
      getTagMatchMetadataLabel({ kind: 'track', item: adjustedTrack }),
      '0.50× +2 st · 4:00',
    );
    assert.equal(
      getTagMatchMetadataLabel({ kind: 'loop', item: adjustedLoop }),
      '0.50× +2 st · 0:20',
    );
  });

  it('puts the transform between a loop card range and its parent track', () => {
    assert.equal(
      formatSavedLoopParentTrackLabel({
        loop: adjustedLoop,
        parentTrackName: 'Kyrie.mp3',
      }),
      '0:10–0:20 · 0.50× +2 st · Kyrie.mp3',
    );
  });
});

describe('adjusted entities in Recents', () => {
  const recentMeta = (playableItem: PlayableItem) =>
    getRecentRowMeta({
      isPlaying: false,
      now: NOW,
      recentRehearsal: buildRecentRehearsalItem({
        activePlayableItem: playableItem,
        activePlaylistSession: null,
        playedAt: PLAYED_AT,
      }),
    });

  it('shows the transform and the scaled duration of an adjusted track', () => {
    assert.equal(
      recentMeta(createTrackPlayableItem(adjustedTrack)),
      '0.50× +2 st · Last played 2 hr ago · 4:00',
    );
  });

  it('shows the transform after the kind for an adjusted loop', () => {
    assert.equal(
      recentMeta(createLoopPlayableItem(adjustedLoop, source)),
      'Loop · 0.50× +2 st · Last played 2 hr ago',
    );
  });
});
