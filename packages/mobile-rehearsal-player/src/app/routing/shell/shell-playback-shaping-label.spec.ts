/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../test-utils/library-test-fixtures.js';
import {
  getMiniPlayerSummary,
  getNowPlayingSurfaceSummary,
  getPlaybackShapingContextLabel,
} from './shell-model.js';

const TRACK_ITEM = createTrackPlayableItem(PLAYABLE_SOURCE);
const BASE_OPTIONS = {
  activePlayableItem: TRACK_ITEM,
  isPlaybackPreparing: false,
  playbackPositionSeconds: 15,
  playbackState: 'playing' as const,
};

describe('shaping label', () => {
  it('lists only shaped axes, speed first', () => {
    assert.equal(
      getPlaybackShapingContextLabel({ pitchSemitones: 0, speedMultiplier: 1 }),
      null,
    );
    assert.equal(
      getPlaybackShapingContextLabel({
        pitchSemitones: 0,
        speedMultiplier: 0.9,
      }),
      '0.90×',
    );
    assert.equal(
      getPlaybackShapingContextLabel({
        pitchSemitones: -2,
        speedMultiplier: 0.75,
      }),
      '0.75× · −2 st',
    );
  });
});

describe('shaping in the rehearsal context lines', () => {
  it('leaves the mini-player context untouched when nothing is shaped', () => {
    const unshaped = getMiniPlayerSummary(BASE_OPTIONS);

    assert.equal(
      getMiniPlayerSummary({ ...BASE_OPTIONS, shapingLabel: null })?.context,
      unshaped?.context,
    );
  });

  it('appends the active speed and pitch to the mini-player context', () => {
    const summary = getMiniPlayerSummary({
      ...BASE_OPTIONS,
      shapingLabel: '0.90× · −2 st',
    });

    assert.ok(summary?.context.endsWith(' • 0.90× · −2 st'));
    assert.ok(summary?.accessibilityLabel.includes('0.90× · −2 st'));
  });

  it('keeps the shaping on a loop item as well', () => {
    const summary = getMiniPlayerSummary({
      ...BASE_OPTIONS,
      activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
      shapingLabel: '0.80×',
    });

    assert.ok(summary?.context.endsWith(' • 0.80×'));
  });

  it('carries the label on the playback sheet summary', () => {
    assert.equal(
      getNowPlayingSurfaceSummary({ ...BASE_OPTIONS, shapingLabel: '1.25×' })
        ?.shapingLabel,
      '1.25×',
    );
    assert.equal(getNowPlayingSurfaceSummary(BASE_OPTIONS)?.shapingLabel, null);
  });
});
