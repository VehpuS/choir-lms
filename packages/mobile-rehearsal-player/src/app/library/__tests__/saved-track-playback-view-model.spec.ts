/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import {
  AUTHORIZED_STATE,
  PLAYABLE_SOURCE,
  SAVED_LOOP,
  UNSUPPORTED_SOURCE,
} from '../../test-utils/library-test-fixtures.js';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  getSavedTrackPlaybackStatusCopy,
  hasSavedTrackPlaybackReachedRangeEnd,
  isTrackPlayerAlreadyInitializedError,
  normalizePlaybackVolumeLevel,
  resolvePlaybackScrubPositionSeconds,
  resolvePlaybackSeekPositionSeconds,
  shouldRepeatSingleItemPlayback,
} from '../utils/saved-track-playback-view-model.js';
import { resolveSavedTrackDurationFromPlayer } from '../utils/saved-track-player-runtime.js';

describe('saved track playback view-model', () => {
  it('creates a full-track playback request with a Drive media URL and bearer token', () => {
    const playbackRequest = createSavedTrackPlaybackRequest({
      accessToken: 'drive-token',
      playableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
    });

    assert.deepEqual(playbackRequest.playableItem, {
      id: 'track:drive:alto-line',
      kind: 'track',
      title: 'Alto Line.mp3',
      sourceId: 'drive:alto-line',
      source: PLAYABLE_SOURCE,
      range: {
        startMs: 0,
        endMs: 185000,
      },
      playlistId: undefined,
      description: 'Full track',
    });
    assert.deepEqual(playbackRequest.track, {
      id: 'track:drive:alto-line',
      url: 'https://www.googleapis.com/drive/v3/files/alto-line?alt=media&supportsAllDrives=true',
      title: 'Alto Line.mp3',
      description: 'Full track',
      duration: 185,
      contentType: 'audio/mpeg',
      headers: {
        Authorization: 'Bearer drive-token',
      },
    });
  });

  it('uses a distinct TrackPlayer id for playlist queue entries', () => {
    const playbackRequest = createSavedTrackPlaybackRequest({
      accessToken: 'drive-token',
      playableItem: createTrackPlayableItem(
        PLAYABLE_SOURCE,
        'playlist-1',
        'entry-1',
      ),
    });

    assert.equal(playbackRequest.track.id, 'track:drive:alto-line:entry-1');
    assert.equal(playbackRequest.playableItem.playlistEntryId, 'entry-1');
  });

  it('blocks full-track playback when a saved source is unavailable', () => {
    const issue = createSavedTrackPlaybackPreconditionIssue(
      AUTHORIZED_STATE,
      createTrackPlayableItem({
        ...PLAYABLE_SOURCE,
        availability: {
          status: 'unavailable',
          reason: 'authorization-required',
          message:
            'Reconnect Google Drive to restore this saved rehearsal track.',
        },
      }),
    );

    assert.deepEqual(issue, {
      playableItemId: 'track:drive:alto-line',
      sourceId: 'drive:alto-line',
      title: 'Track unavailable',
      message: 'Reconnect Google Drive to restore this saved rehearsal track.',
    });
  });

  it('computes play, pause, resume, and replay labels for saved-track playback', () => {
    const playbackRequest = createSavedTrackPlaybackRequest({
      accessToken: 'drive-token',
      playableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
    });

    assert.deepEqual(
      getSavedTrackPlaybackActionCopy({
        activePlayableItem: null,
        isPreparing: false,
        playableItem: playbackRequest.playableItem,
        playbackState: undefined,
      }),
      {
        disabled: false,
        label: 'Play',
      },
    );
    assert.deepEqual(
      getSavedTrackPlaybackActionCopy({
        activePlayableItem: playbackRequest.playableItem,
        isPreparing: false,
        playableItem: playbackRequest.playableItem,
        playbackState: 'playing',
      }),
      {
        disabled: false,
        label: 'Pause',
      },
    );
    assert.deepEqual(
      getSavedTrackPlaybackActionCopy({
        activePlayableItem: playbackRequest.playableItem,
        isPreparing: false,
        playableItem: playbackRequest.playableItem,
        playbackState: 'paused',
      }),
      {
        disabled: false,
        label: 'Resume',
      },
    );
    assert.deepEqual(
      getSavedTrackPlaybackActionCopy({
        activePlayableItem: playbackRequest.playableItem,
        isPreparing: false,
        playableItem: playbackRequest.playableItem,
        playbackState: 'ended',
      }),
      {
        disabled: false,
        label: 'Replay',
      },
    );

    const loopPlayableItem = createLoopPlayableItem(
      SAVED_LOOP,
      PLAYABLE_SOURCE,
    );

    assert.deepEqual(
      getSavedTrackPlaybackActionCopy({
        activePlayableItem: loopPlayableItem,
        isPreparing: false,
        playableItem: playbackRequest.playableItem,
        playbackState: 'playing',
      }),
      {
        disabled: false,
        label: 'Play',
      },
    );
  });

  it('summarizes active playback and maps playback failures back to the source card', () => {
    const playbackRequest = createSavedTrackPlaybackRequest({
      accessToken: 'drive-token',
      playableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
    });
    const loopPlayableItem = createLoopPlayableItem(
      SAVED_LOOP,
      PLAYABLE_SOURCE,
    );
    const playbackIssue = {
      playableItemId: loopPlayableItem.id,
      sourceId: PLAYABLE_SOURCE.id,
      title: 'Playback failed',
      message:
        'The saved rehearsal library could not play "Alto Line.mp3". network timeout',
    };

    assert.deepEqual(
      getSavedTrackPlaybackStatusCopy({
        activePlayableItem: playbackRequest.playableItem,
        durationSeconds: 185,
        isPreparing: false,
        issue: null,
        playbackState: 'playing',
        positionSeconds: 42,
      }),
      {
        title: 'Now playing',
        message: 'Alto Line.mp3 • 0:42 of 3:05.',
        tone: 'ready',
      },
    );
    assert.equal(
      getSavedTrackPlaybackItemIssue(playbackIssue, loopPlayableItem),
      'The saved rehearsal library could not play "Alto Line.mp3". network timeout',
    );
    assert.equal(
      getSavedTrackPlaybackItemIssue(
        playbackIssue,
        createTrackPlayableItem(UNSUPPORTED_SOURCE),
      ),
      undefined,
    );
  });

  it('detects when loop playback reaches the saved range end', () => {
    assert.equal(
      hasSavedTrackPlaybackReachedRangeEnd({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        playbackState: 'playing',
        positionSeconds: 18.5,
      }),
      true,
    );
    assert.equal(
      hasSavedTrackPlaybackReachedRangeEnd({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        playbackState: 'playing',
        positionSeconds: 18.5,
      }),
      false,
    );
  });

  it('bounds seek jumps within the active item range', () => {
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        currentPositionSeconds: 30,
        deltaSeconds: -45,
      }),
      0,
    );
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        currentPositionSeconds: 180,
        deltaSeconds: 15,
      }),
      185,
    );
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        currentPositionSeconds: 15,
        deltaSeconds: -10,
      }),
      12,
    );
    assert.equal(
      resolvePlaybackSeekPositionSeconds({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        currentPositionSeconds: 15,
        deltaSeconds: 10,
      }),
      18.5,
    );
  });

  it('bounds scrub positions within the active item range', () => {
    assert.equal(
      resolvePlaybackScrubPositionSeconds({
        activePlayableItem: createTrackPlayableItem(PLAYABLE_SOURCE),
        requestedPositionSeconds: -8,
      }),
      0,
    );
    assert.equal(
      resolvePlaybackScrubPositionSeconds({
        activePlayableItem: createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
        requestedPositionSeconds: 30,
      }),
      18.5,
    );
  });

  it('normalizes playback volume levels into the supported range', () => {
    assert.equal(normalizePlaybackVolumeLevel(-0.2), 0);
    assert.equal(normalizePlaybackVolumeLevel(0.45), 0.45);
    assert.equal(normalizePlaybackVolumeLevel(1.8), 1);
    assert.equal(normalizePlaybackVolumeLevel(Number.NaN), 1);
  });

  it('only repeats standalone playback when repeat-one mode is active', () => {
    assert.equal(shouldRepeatSingleItemPlayback('off'), false);
    assert.equal(shouldRepeatSingleItemPlayback('one'), true);
    assert.equal(shouldRepeatSingleItemPlayback('all'), false);
  });

  it('recognizes TrackPlayer already-initialized setup errors', () => {
    assert.equal(
      isTrackPlayerAlreadyInitializedError({
        code: 'player_already_initialized',
      }),
      true,
    );
    assert.equal(
      isTrackPlayerAlreadyInitializedError({
        message: 'The player has already been initialized via setupPlayer.',
      }),
      true,
    );
    assert.equal(
      isTrackPlayerAlreadyInitializedError(new Error('network timeout')),
      false,
    );
  });

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
