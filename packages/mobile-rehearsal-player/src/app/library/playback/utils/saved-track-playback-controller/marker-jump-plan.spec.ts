/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createAdjustedTrackSource,
  createDriveAudioSource,
  createLoopPlayableItem,
  createTrackPlayableItem,
  type NamedLoop,
} from '@org/audio-library-models';

import { planMarkerJump } from './marker-jump-plan.js';

const track = createDriveAudioSource({
  driveFileId: 'kyrie',
  name: 'Kyrie.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 240_000,
  availability: { status: 'available' },
});
const otherTrack = createDriveAudioSource({
  driveFileId: 'gloria',
  name: 'Gloria.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 100_000,
  availability: { status: 'available' },
});
const adjustedSource = createAdjustedTrackSource({
  source: track,
  transform: {
    pitchSemitones: 0,
    speedMultiplier: 0.75,
    tempoSource: 'multiplier',
  },
});
const loop = {
  id: 'loop-1',
  name: 'Verse 2',
  sourceId: track.id,
  sourceName: track.name,
  startMs: 60_000,
  endMs: 90_000,
} as NamedLoop;

const trackItem = createTrackPlayableItem(track);
const adjustedItem = createTrackPlayableItem(adjustedSource);
const loopItem = createLoopPlayableItem(loop, track);

describe('planMarkerJump', () => {
  it('seeks by absolute audio position when the track is loaded', () => {
    assert.deepEqual(
      planMarkerJump({
        active: trackItem,
        positionMs: 120_000,
        target: trackItem,
      }),
      { kind: 'seek', positionSeconds: 120 },
    );
  });

  it('seeks when an adjusted copy of the track is loaded, in audio time', () => {
    assert.deepEqual(
      planMarkerJump({
        active: adjustedItem,
        positionMs: 60_000,
        target: trackItem,
      }),
      { kind: 'seek', positionSeconds: 60 },
    );
  });

  it('seeks when the target is an adjusted copy and the track is loaded', () => {
    assert.equal(
      planMarkerJump({
        active: trackItem,
        positionMs: 60_000,
        target: adjustedItem,
      }).kind,
      'seek',
    );
  });

  it('seeks inside a loaded loop that contains the marker', () => {
    assert.equal(
      planMarkerJump({
        active: loopItem,
        positionMs: 70_000,
        target: loopItem,
      }).kind,
      'seek',
    );
  });

  it('loads the target when the loaded loop does not contain the marker', () => {
    assert.deepEqual(
      planMarkerJump({
        active: loopItem,
        positionMs: 20_000,
        target: trackItem,
      }),
      { kind: 'load', positionSeconds: 20 },
    );
  });

  it('loads the target when nothing is loaded', () => {
    assert.deepEqual(
      planMarkerJump({ active: null, positionMs: 45_000, target: trackItem }),
      { kind: 'load', positionSeconds: 45 },
    );
  });

  it('loads the target when a different track is loaded', () => {
    const otherItem = createTrackPlayableItem(otherTrack);

    assert.equal(
      planMarkerJump({
        active: otherItem,
        positionMs: 45_000,
        target: trackItem,
      }).kind,
      'load',
    );
  });

  it('clamps a marker outside the loop to the loop in a loop context', () => {
    assert.deepEqual(
      planMarkerJump({ active: null, positionMs: 95_000, target: loopItem }),
      { kind: 'load', positionSeconds: 90 },
    );
    assert.deepEqual(
      planMarkerJump({
        active: loopItem,
        positionMs: 10_000,
        target: loopItem,
      }),
      { kind: 'seek', positionSeconds: 60 },
    );
  });

  it('refuses a marker beyond the known audio length', () => {
    assert.deepEqual(
      planMarkerJump({
        active: trackItem,
        positionMs: 240_001,
        target: trackItem,
      }),
      { kind: 'refused', reason: 'past-end' },
    );
  });

  it('allows a marker exactly at the end', () => {
    assert.equal(
      planMarkerJump({
        active: trackItem,
        positionMs: 240_000,
        target: trackItem,
      }).kind,
      'seek',
    );
  });
});
