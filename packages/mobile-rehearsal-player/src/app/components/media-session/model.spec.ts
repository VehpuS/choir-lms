import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  shouldReportPosition,
  toMediaMetadata,
  toPlaybackState,
  toPositionState,
} from './model';

describe('toPlaybackState', () => {
  it('is none without an item, and playing or paused with one', () => {
    assert.equal(toPlaybackState({ hasItem: false, isPlaying: true }), 'none');
    assert.equal(
      toPlaybackState({ hasItem: true, isPlaying: true }),
      'playing',
    );
    assert.equal(
      toPlaybackState({ hasItem: true, isPlaying: false }),
      'paused',
    );
  });
});

describe('toMediaMetadata', () => {
  it('names the item and gives artwork that follows the base path', () => {
    const metadata = toMediaMetadata('Kyrie');

    assert.equal(metadata.title, 'Kyrie');
    assert.ok(metadata.artwork.length >= 2);

    for (const { src } of metadata.artwork) {
      assert.ok(!src.startsWith('/'), `${src} ignores the base path`);
    }
  });
});

describe('toPositionState', () => {
  it('reports duration, position and rate', () => {
    assert.deepEqual(
      toPositionState({
        durationSeconds: 60,
        playbackRate: 0.5,
        positionSeconds: 12,
      }),
      { duration: 60, playbackRate: 0.5, position: 12 },
    );
  });

  it('clamps a position past the end or below zero', () => {
    assert.equal(
      toPositionState({
        durationSeconds: 60,
        playbackRate: 1,
        positionSeconds: 75,
      })?.position,
      60,
    );
    assert.equal(
      toPositionState({
        durationSeconds: 60,
        playbackRate: 1,
        positionSeconds: -3,
      })?.position,
      0,
    );
  });

  it('is null while the length or rate is unusable', () => {
    for (const durationSeconds of [0, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.equal(
        toPositionState({
          durationSeconds,
          playbackRate: 1,
          positionSeconds: 0,
        }),
        null,
      );
    }

    assert.equal(
      toPositionState({
        durationSeconds: 60,
        playbackRate: 0,
        positionSeconds: 0,
      }),
      null,
    );
  });
});

describe('shouldReportPosition', () => {
  const base = {
    actualSeconds: 10,
    elapsedSecondsSinceReport: 0,
    isPlaying: true,
    playbackRate: 1,
    reportedSeconds: 10,
  };

  it('reports the first time', () => {
    assert.equal(
      shouldReportPosition({ ...base, reportedSeconds: null }),
      true,
    );
  });

  it('stays quiet while playback advances as reported', () => {
    assert.equal(
      shouldReportPosition({
        ...base,
        actualSeconds: 15,
        elapsedSecondsSinceReport: 5,
      }),
      false,
    );
  });

  it('follows the playback rate', () => {
    assert.equal(
      shouldReportPosition({
        ...base,
        actualSeconds: 12.5,
        elapsedSecondsSinceReport: 5,
        playbackRate: 0.5,
      }),
      false,
    );
  });

  it('reports a seek or a loop turning over', () => {
    assert.equal(
      shouldReportPosition({
        ...base,
        actualSeconds: 40,
        elapsedSecondsSinceReport: 5,
      }),
      true,
    );
    assert.equal(
      shouldReportPosition({
        ...base,
        actualSeconds: 2,
        elapsedSecondsSinceReport: 8,
      }),
      true,
    );
  });

  it('expects no movement while paused', () => {
    assert.equal(
      shouldReportPosition({
        ...base,
        isPlaying: false,
        actualSeconds: 14,
        elapsedSecondsSinceReport: 4,
      }),
      true,
    );
  });
});
