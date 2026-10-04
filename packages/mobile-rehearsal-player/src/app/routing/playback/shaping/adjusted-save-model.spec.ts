import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  createLoopPlayableItem,
  createTrackPlayableItem,
  type NamedLoop,
} from '@org/audio-library-models';

import {
  ALREADY_ADJUSTED_REASON,
  NOTHING_TO_SAVE_REASON,
  SOURCE_NOT_SAVED_REASON,
  buildAdjustedSaveEntity,
  resolveAdjustedSaveAvailability,
} from './adjusted-save-model';

const source = createDriveAudioSource({
  driveFileId: 'file-1',
  name: 'Kyrie.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 120_000,
  availability: { status: 'available' },
});
const loop: NamedLoop = {
  id: 'loop-1',
  name: 'Entrance',
  sourceId: source.id,
  sourceName: source.name,
  startMs: 12_000,
  endMs: 24_000,
  ownerId: 'owner',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};
const trackItem = createTrackPlayableItem(source);
const loopItem = createLoopPlayableItem(loop, source);
const shaped = { pitchSemitones: -2, speedMultiplier: 0.8 };
const savedSourceIds = new Set([source.id]);

describe('resolveAdjustedSaveAvailability', () => {
  it('offers only an adjusted track for a full track', () => {
    assert.deepEqual(
      resolveAdjustedSaveAvailability({
        activeItem: trackItem,
        effective: shaped,
        isItemTransformActive: false,
        savedSourceIds,
      }),
      {
        status: 'ready',
        options: [{ kind: 'track', label: 'Save as adjusted track' }],
      },
    );
  });

  it('offers the adjusted loop first, then the adjusted track, for a loop', () => {
    const availability = resolveAdjustedSaveAvailability({
      activeItem: loopItem,
      effective: shaped,
      isItemTransformActive: false,
      savedSourceIds,
    });

    assert.equal(availability.status, 'ready');
    assert.deepEqual(
      availability.status === 'ready' &&
        availability.options.map(({ kind }) => kind),
      ['loop', 'track'],
    );
  });

  it('explains why nothing can be saved', () => {
    const base = {
      activeItem: trackItem,
      effective: shaped,
      isItemTransformActive: false,
      savedSourceIds,
    };

    assert.deepEqual(
      resolveAdjustedSaveAvailability({
        ...base,
        effective: { pitchSemitones: 0, speedMultiplier: 1 },
      }),
      { status: 'unavailable', reason: NOTHING_TO_SAVE_REASON },
    );
    assert.deepEqual(
      resolveAdjustedSaveAvailability({ ...base, isItemTransformActive: true }),
      { status: 'unavailable', reason: ALREADY_ADJUSTED_REASON },
    );
    assert.deepEqual(
      resolveAdjustedSaveAvailability({
        ...base,
        savedSourceIds: new Set<string>(),
      }),
      { status: 'unavailable', reason: SOURCE_NOT_SAVED_REASON },
    );
  });
});

describe('buildAdjustedSaveEntity', () => {
  const now = '2026-10-04T10:00:00.000Z';

  it('builds an adjusted loop that keeps the range and names it with the transform', () => {
    const entity = buildAdjustedSaveEntity({
      activeItem: loopItem,
      effective: shaped,
      kind: 'loop',
      now,
      ownerId: 'owner',
      savedSource: source,
    });

    assert.equal(entity?.kind, 'loop');
    assert.deepEqual(entity?.kind === 'loop' && entity.loop, {
      id: `loop:${source.id}:${now}`,
      name: 'Entrance • 0.80× −2 st',
      sourceId: source.id,
      sourceName: source.name,
      startMs: 12_000,
      endMs: 24_000,
      transform: { ...shaped, tempoSource: 'multiplier' },
      ownerId: 'owner',
      createdAt: now,
      updatedAt: now,
    });
  });

  it('builds an adjusted track of the whole source, even from a loop', () => {
    const entity = buildAdjustedSaveEntity({
      activeItem: loopItem,
      effective: shaped,
      kind: 'track',
      now,
      ownerId: 'owner',
      savedSource: source,
    });

    assert.equal(entity?.kind, 'track');
    assert.equal(
      entity?.kind === 'track' && entity.source.name,
      'Kyrie.mp3 • 0.80× −2 st',
    );
    assert.equal(
      entity?.kind === 'track' && entity.source.adjustment?.sourceRef,
      source.id,
    );
  });

  it('builds no loop for a full track', () => {
    assert.equal(
      buildAdjustedSaveEntity({
        activeItem: trackItem,
        effective: shaped,
        kind: 'loop',
        ownerId: 'owner',
        savedSource: source,
      }),
      null,
    );
  });
});
