/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/rehearsal-domain';

import {
  AUTHORIZED_STATE,
  PLAYABLE_SOURCE,
  SAVED_LOOP,
  UNSUPPORTED_SOURCE,
} from './library-test-fixtures.js';
import {
  createSavedTrackPlaybackPreconditionIssue,
  createSavedTrackPlaybackRequest,
  getSavedTrackPlaybackActionCopy,
  getSavedTrackPlaybackItemIssue,
  getSavedTrackPlaybackStatusCopy,
  hasSavedTrackPlaybackReachedRangeEnd,
} from './saved-track-playback-view-model.js';

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
});
