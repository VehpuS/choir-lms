import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type {
  DerivedLoopMarker,
  DriveAudioSource,
  PlayableItem,
  TrackMarker,
} from '@org/audio-library-models';

import type { SourceMarkersResolution } from '../hooks/use-source-markers';
import {
  resolvePlayableMarkersItem,
  resolveWaveformMarkers,
} from './waveform-markers';

const OWNER = { id: 'source-1', durationMs: 180_000 } as DriveAudioSource;

const marker = (id: string, positionMs: number): TrackMarker => ({
  id,
  name: id,
  positionMs,
  createdAt: '2026-10-22T00:00:00.000Z',
});

const derived: DerivedLoopMarker = {
  origin: 'loop-start',
  loopId: 'loop-1',
  name: 'Verse 2 start',
  positionMs: 60_000,
};

const resolution = (
  overrides: Partial<SourceMarkersResolution> = {},
): SourceMarkersResolution => ({
  owner: OWNER as SourceMarkersResolution['owner'],
  explicit: [marker('a', 10_000), marker('b', 70_000), marker('late', 400_000)],
  derived: [derived],
  ...overrides,
});

const TRACK_ITEM = { kind: 'track', range: { startMs: 0, endMs: 180_000 } };
const LOOP_ITEM = { kind: 'loop', range: { startMs: 50_000, endMs: 90_000 } };

describe('resolvePlayableMarkersItem', () => {
  it('addresses a track by its source and a loop by its id', () => {
    assert.deepEqual(
      resolvePlayableMarkersItem({ kind: 'track', sourceId: 'source-1' }),
      { id: 'source-1', sourceId: 'source-1' },
    );
    assert.deepEqual(
      resolvePlayableMarkersItem({
        kind: 'loop',
        loopId: 'loop-1',
        sourceId: 'source-1',
      }),
      { id: 'loop-1', sourceId: 'source-1' },
    );
  });

  it('treats a loop without a saved id (a preview) as its track', () => {
    assert.deepEqual(
      resolvePlayableMarkersItem({ kind: 'loop', sourceId: 'source-1' }),
      { id: 'source-1', sourceId: 'source-1' },
    );
  });
});

describe('resolveWaveformMarkers', () => {
  it('draws explicit and loop markers for a track, leaving out past-end ones', () => {
    const markers = resolveWaveformMarkers(
      TRACK_ITEM as Pick<PlayableItem, 'kind' | 'range'>,
      resolution(),
      'all',
    );

    assert.deepEqual(
      markers.map(({ name, kind }) => [name, kind]),
      [
        ['a', 'explicit'],
        ['Verse 2 start', 'derived'],
        ['b', 'explicit'],
      ],
    );
    assert.equal(markers[0]?.timeLabel, '0:10.0');
  });

  it('follows the My markers filter', () => {
    const markers = resolveWaveformMarkers(
      TRACK_ITEM as Pick<PlayableItem, 'kind' | 'range'>,
      resolution(),
      'mine',
    );

    assert.deepEqual(
      markers.map(({ key }) => key),
      ['marker:a', 'marker:b'],
    );
  });

  it('limits a loop to markers inside its range', () => {
    const markers = resolveWaveformMarkers(
      LOOP_ITEM as Pick<PlayableItem, 'kind' | 'range'>,
      resolution(),
      'all',
    );

    assert.deepEqual(
      markers.map(({ name }) => name),
      ['Verse 2 start', 'b'],
    );
  });

  it('draws nothing when the owning track is gone', () => {
    assert.deepEqual(
      resolveWaveformMarkers(
        TRACK_ITEM as Pick<PlayableItem, 'kind' | 'range'>,
        resolution({ owner: null }),
        'all',
      ),
      [],
    );
  });
});
