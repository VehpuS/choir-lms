/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTrackPlayableItem } from '@org/audio-library-models';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { resolveSavedTrackDurationFromPlayer } from './saved-track-player-runtime.js';

describe('saved track player runtime', () => {
  it('probes duration from TrackPlayer without keeping the muted probe active', async () => {
    const playerCalls: string[] = [];
    let progressReadCount = 0;

    const resolvedDurationMs = await resolveSavedTrackDurationFromPlayer(
      {
        accessToken: 'drive-token',
        playableItem: createTrackPlayableItem({
          ...PLAYABLE_SOURCE,
          durationMs: undefined,
        }),
      },
      {
        async ensurePlayerReady() {
          playerCalls.push('ensurePlayerReady');
        },
        player: {
          async add() {
            playerCalls.push('add');
          },
          async getProgress() {
            progressReadCount += 1;

            return {
              buffered: 0,
              duration: progressReadCount >= 3 ? 93 : 0,
              position: 0,
            };
          },
          async getVolume() {
            return 0.75;
          },
          async pause() {
            playerCalls.push('pause');
          },
          async play() {
            playerCalls.push('play');
          },
          async reset() {
            playerCalls.push('reset');
          },
          async setPlayWhenReady(playWhenReady) {
            playerCalls.push(`setPlayWhenReady:${String(playWhenReady)}`);
            return playWhenReady;
          },
          async setVolume(volumeLevel) {
            playerCalls.push(`setVolume:${String(volumeLevel)}`);
          },
          async setupPlayer() {
            playerCalls.push('setupPlayer');
          },
          async updateOptions() {
            playerCalls.push('updateOptions');
          },
        },
        async wait() {
          playerCalls.push('wait');
        },
      },
    );

    assert.equal(resolvedDurationMs, 93000);
    assert.deepEqual(playerCalls, [
      'ensurePlayerReady',
      'reset',
      'add',
      'setPlayWhenReady:false',
      'setVolume:0',
      'play',
      'wait',
      'pause',
      'setPlayWhenReady:false',
      'setVolume:0.75',
      'reset',
    ]);
  });
});
