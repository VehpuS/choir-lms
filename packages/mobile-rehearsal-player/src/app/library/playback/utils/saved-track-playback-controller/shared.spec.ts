/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlayableItem } from '@org/audio-library-models';

import {
  createSavedTrackPlaybackControllerOptionsProxy,
  trackPlayerState,
  type SavedTrackPlaybackControllerOptions,
} from './shared.js';

const createControllerOptions = (
  overrides: Partial<SavedTrackPlaybackControllerOptions> = {},
): SavedTrackPlaybackControllerOptions => {
  return {
    authState: {
      accessToken: 'token-1',
      scope: 'scope',
      status: 'authorized',
    },
    activePlayableItemRef: {
      current: null as PlayableItem | null,
    },
    activePlaylistSessionRef: {
      current: null,
    },
    isAdvancingPlaylistRef: {
      current: false,
    },
    isPreparing: false,
    playbackState: trackPlayerState.Paused,
    progressDurationSeconds: 0,
    progressPositionSeconds: 0,
    setActivePlayableItem: () => undefined,
    setActivePlaylistSession: () => undefined,
    setIsPreparing: () => undefined,
    setIssue: () => undefined,
    setVolumeLevel: () => undefined,
    volumeLevelRef: {
      current: 1,
    },
    ...overrides,
  };
};

describe('createSavedTrackPlaybackControllerOptionsProxy', () => {
  it('reads the latest controller options through the shared proxy', () => {
    const initialOptions = createControllerOptions();
    const optionsRef = {
      current: initialOptions,
    };
    const proxy = createSavedTrackPlaybackControllerOptionsProxy(optionsRef);

    assert.equal(proxy.authState.accessToken, 'token-1');
    assert.equal(proxy.playbackState, trackPlayerState.Paused);
    assert.equal(proxy.progressPositionSeconds, 0);

    optionsRef.current = createControllerOptions({
      authState: {
        accessToken: 'token-2',
        scope: 'scope',
        status: 'authorized',
      },
      isPreparing: true,
      playbackState: trackPlayerState.Playing,
      progressDurationSeconds: 187,
      progressPositionSeconds: 42,
      volumeLevelRef: {
        current: 0.35,
      },
    });

    assert.equal(proxy.authState.accessToken, 'token-2');
    assert.equal(proxy.isPreparing, true);
    assert.equal(proxy.playbackState, trackPlayerState.Playing);
    assert.equal(proxy.progressDurationSeconds, 187);
    assert.equal(proxy.progressPositionSeconds, 42);
    assert.equal(proxy.volumeLevelRef.current, 0.35);
  });
});
