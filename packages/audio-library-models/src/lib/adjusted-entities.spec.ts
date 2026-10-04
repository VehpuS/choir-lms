import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAdjustedLoop,
  createAdjustedTrackSource,
  getAdjustedDurationMs,
  getAdjustedEntityDefaultName,
  hasSavableTransform,
  parseLoopTransform,
  parseSourceAdjustment,
} from './adjusted-entities.js';
import {
  createLoopPlayableItem,
  createTrackPlayableItem,
  type DriveAudioSource,
} from './rehearsal-domain.js';

const source: DriveAudioSource = {
  id: 'drive:file-1',
  provider: 'google-drive',
  driveFileId: 'file-1',
  name: 'Kyrie',
  mimeType: 'audio/mpeg',
  durationMs: 120_000,
  tags: ['Soprano'],
  sourceLocation: { pathSegments: ['Choir'] } as never,
  createdAt: '2026-10-01T00:00:00.000Z',
  availability: { status: 'available' } as never,
};
const slowAndLow = {
  pitchSemitones: -2,
  speedMultiplier: 0.8,
  tempoSource: 'multiplier' as const,
};

describe('adjusted tracks', () => {
  it('keeps the source audio reference but not its Drive provenance or tags', () => {
    const adjusted = createAdjustedTrackSource({
      createdAt: '2026-10-04T00:00:00.000Z',
      source,
      transform: slowAndLow,
    });

    assert.equal(adjusted.id, 'adjusted:drive:file-1:2026-10-04T00:00:00.000Z');
    assert.equal(adjusted.driveFileId, 'file-1');
    assert.equal(adjusted.name, 'Kyrie • 0.80× −2 st');
    assert.deepEqual(adjusted.adjustment, {
      sourceRef: 'drive:file-1',
      transform: slowAndLow,
    });
    assert.equal(adjusted.tags, undefined);
    assert.equal(adjusted.sourceLocation, undefined);
  });

  it('refuses to adjust an adjusted track or to save a neutral transform', () => {
    const adjusted = createAdjustedTrackSource({
      source,
      transform: slowAndLow,
    });

    assert.throws(() =>
      createAdjustedTrackSource({ source: adjusted, transform: slowAndLow }),
    );
    assert.throws(() =>
      createAdjustedTrackSource({
        source,
        transform: { ...slowAndLow, pitchSemitones: 0, speedMultiplier: 1 },
      }),
    );
  });

  it('plays with its own transform, while an ordinary track carries none', () => {
    const adjusted = createAdjustedTrackSource({
      source,
      transform: slowAndLow,
    });

    assert.deepEqual(createTrackPlayableItem(adjusted).transform, slowAndLow);
    assert.equal(createTrackPlayableItem(source).transform, undefined);
  });
});

describe('adjusted loops', () => {
  it('keeps the source, range and transform', () => {
    const loop = createAdjustedLoop({
      id: 'loop-1',
      name: 'Bars 1-4',
      ownerId: 'owner',
      source,
      startMs: 1000,
      endMs: 9000,
      transform: slowAndLow,
    });

    assert.equal(loop.sourceId, 'drive:file-1');
    assert.equal(loop.sourceName, 'Kyrie');
    assert.deepEqual(loop.transform, slowAndLow);
    assert.deepEqual(
      createLoopPlayableItem(loop, source).transform,
      slowAndLow,
    );
  });
});

describe('stored adjustment reads', () => {
  it('normalizes an out-of-range transform', () => {
    const adjustment = parseSourceAdjustment({
      sourceRef: 'drive:file-1',
      transform: { speedMultiplier: 9, pitchSemitones: 40 },
    });

    assert.equal(adjustment?.transform.speedMultiplier, 2);
    assert.equal(adjustment?.transform.pitchSemitones, 12);
  });

  it('rejects a missing source reference, a missing transform, and a neutral one', () => {
    assert.equal(parseSourceAdjustment({ transform: slowAndLow }), null);
    assert.equal(parseSourceAdjustment({ sourceRef: 'x' }), null);
    assert.equal(parseSourceAdjustment('nope'), null);
    assert.equal(parseLoopTransform(undefined), null);
    assert.equal(parseLoopTransform({ speedMultiplier: 1 }), null);
    assert.deepEqual(parseLoopTransform(slowAndLow), slowAndLow);
  });
});

describe('transform helpers', () => {
  it('divides the source duration by the speed', () => {
    assert.equal(getAdjustedDurationMs(120_000, 0.5), 240_000);
    assert.equal(getAdjustedDurationMs(120_000, 2), 60_000);
  });

  it('names an entity with its shaped parts and leaves a neutral name alone', () => {
    assert.equal(
      getAdjustedEntityDefaultName('Kyrie', {
        ...slowAndLow,
        pitchSemitones: 0,
      }),
      'Kyrie • 0.80×',
    );
    assert.equal(
      getAdjustedEntityDefaultName('Kyrie', {
        pitchSemitones: 0,
        speedMultiplier: 1,
      }),
      'Kyrie',
    );
    assert.equal(hasSavableTransform(slowAndLow), true);
  });
});
