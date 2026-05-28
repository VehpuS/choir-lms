/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dispatchSavedTrackPlaybackRemoteCommand,
  registerSavedTrackPlaybackRemoteCommandHandlers,
} from '../utils/saved-track-playback-remote-controls.js';
import { registerSavedTrackPlaybackRemoteEventListeners } from '../utils/saved-track-playback-service.js';
import { resolveSavedTrackPlayerSupport } from '../utils/saved-track-player-interop.js';
import { syncSavedTrackPlayerCapabilities } from '../utils/saved-track-player-runtime.js';

describe('saved track playback service', () => {
  it('reports Expo Go as unsupported without loading TrackPlayer', () => {
    let didAttemptLoad = false;

    const support = resolveSavedTrackPlayerSupport({
      appOwnership: 'expo',
      executionEnvironment: 'storeClient',
      loadTrackPlayerModule() {
        didAttemptLoad = true;
        throw new Error('should not load');
      },
    });

    assert.equal(didAttemptLoad, false);
    assert.equal(support.isSupported, false);
    assert.match(support.message ?? '', /development build.*Expo Go/i);
  });

  it('loads TrackPlayer when native playback support is available', () => {
    const fakeModule = {
      Event: {},
      State: {},
      default: {},
      usePlaybackState() {
        return {
          state: undefined,
        };
      },
      useProgress() {
        return {
          buffered: 0,
          duration: 0,
          position: 0,
        };
      },
      useTrackPlayerEvents() {
        return undefined;
      },
    };

    const support = resolveSavedTrackPlayerSupport({
      appOwnership: null,
      executionEnvironment: 'standalone',
      loadTrackPlayerModule() {
        return fakeModule as never;
      },
    });

    assert.equal(support.isSupported, true);
    assert.equal(support.module, fakeModule);
    assert.equal(support.message, null);
  });

  it('dispatches remote commands to the latest registered handlers', async () => {
    const receivedCommands: string[] = [];
    const unregisterFirstHandlers =
      registerSavedTrackPlaybackRemoteCommandHandlers({
        async next() {
          receivedCommands.push('first:next');
        },
        async pause() {
          receivedCommands.push('first:pause');
        },
        async play() {
          receivedCommands.push('first:play');
        },
        async previous() {
          receivedCommands.push('first:previous');
        },
      });
    const unregisterSecondHandlers =
      registerSavedTrackPlaybackRemoteCommandHandlers({
        async next() {
          receivedCommands.push('second:next');
        },
        async pause() {
          receivedCommands.push('second:pause');
        },
        async play() {
          receivedCommands.push('second:play');
        },
        async previous() {
          receivedCommands.push('second:previous');
        },
      });

    unregisterFirstHandlers();

    assert.equal(await dispatchSavedTrackPlaybackRemoteCommand('play'), true);
    assert.deepEqual(receivedCommands, ['second:play']);

    unregisterSecondHandlers();

    assert.equal(await dispatchSavedTrackPlaybackRemoteCommand('play'), false);
  });

  it('registers remote transport listeners that dispatch queue commands', async () => {
    const listeners = new Map<string, () => Promise<void> | void>();
    const removedEvents: string[] = [];
    const receivedCommands: string[] = [];
    const cleanup = registerSavedTrackPlaybackRemoteEventListeners({
      async dispatchRemoteCommand(command) {
        receivedCommands.push(command);
        return true;
      },
      player: {
        addEventListener(eventName, handler) {
          listeners.set(eventName, handler);

          return {
            remove() {
              removedEvents.push(eventName);
            },
          };
        },
      },
      remoteEvents: {
        play: 'remote-play',
        pause: 'remote-pause',
        next: 'remote-next',
        previous: 'remote-previous',
      },
    });

    assert.deepEqual([...listeners.keys()], [
      'remote-play',
      'remote-pause',
      'remote-next',
      'remote-previous',
    ]);

    await listeners.get('remote-next')?.();
    await listeners.get('remote-previous')?.();
    cleanup();

    assert.deepEqual(receivedCommands, ['next', 'previous']);
    assert.deepEqual(removedEvents, [
      'remote-play',
      'remote-pause',
      'remote-next',
      'remote-previous',
    ]);
  });

  it('adds queue navigation capabilities when a playlist session is active', async () => {
    const appliedOptions: unknown[] = [];
    const lifecycleCalls: string[] = [];

    await syncSavedTrackPlayerCapabilities(
      {
        supportsQueueNavigation: true,
      },
      {
        async ensurePlayerReady() {
          lifecycleCalls.push('ensurePlayerReady');
        },
        player: {
          async updateOptions(options) {
            appliedOptions.push(options);
          },
        },
        trackPlayerModule: {
          Capability: {
            Pause: 'pause',
            Play: 'play',
            SeekTo: 'seek-to',
            SkipToNext: 'skip-to-next',
            SkipToPrevious: 'skip-to-previous',
            Stop: 'stop',
          },
        },
      },
    );

    assert.deepEqual(lifecycleCalls, ['ensurePlayerReady']);
    assert.deepEqual(appliedOptions, [
      {
        capabilities: [
          'play',
          'pause',
          'stop',
          'seek-to',
          'skip-to-next',
          'skip-to-previous',
        ],
        compactCapabilities: ['play', 'pause'],
        notificationCapabilities: [
          'play',
          'pause',
          'stop',
          'seek-to',
          'skip-to-next',
          'skip-to-previous',
        ],
      },
    ]);
  });
});