/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dispatchSavedTrackPlaybackRemoteCommand,
  registerSavedTrackPlaybackRemoteCommandHandlers,
} from './saved-track-playback-remote-controls.js';
import { registerSavedTrackPlaybackRemoteEventListeners } from './saved-track-playback-service.js';
import {
  getSavedTrackPlayerEventMap,
  type SavedTrackPlayerModule,
} from './saved-track-player-interop.js';
import { syncSavedTrackPlayerCapabilities } from './saved-track-player-runtime.js';

describe('saved track playback service remote transport', () => {
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
    const fallbackEventMap = getSavedTrackPlayerEventMap({
      appOwnership: 'expo',
      executionEnvironment: 'storeClient',
    });
    type RemoteEvents = NonNullable<
      NonNullable<
        Parameters<typeof registerSavedTrackPlaybackRemoteEventListeners>[0]
      >['remoteEvents']
    >;
    const remoteEvents: RemoteEvents = {
      play: fallbackEventMap.RemotePlay as RemoteEvents['play'],
      pause: fallbackEventMap.RemotePause as RemoteEvents['pause'],
      next: fallbackEventMap.RemoteNext as RemoteEvents['next'],
      previous: fallbackEventMap.RemotePrevious as RemoteEvents['previous'],
    };
    const listeners = new Map<
      (typeof remoteEvents)[keyof typeof remoteEvents],
      () => Promise<void> | void
    >();
    const removedEvents: Array<
      (typeof remoteEvents)[keyof typeof remoteEvents]
    > = [];
    const receivedCommands: string[] = [];
    const cleanup = registerSavedTrackPlaybackRemoteEventListeners({
      async dispatchRemoteCommand(command) {
        receivedCommands.push(command);
        return true;
      },
      player: {
        addEventListener(eventName, handler) {
          listeners.set(
            eventName as (typeof remoteEvents)[keyof typeof remoteEvents],
            handler,
          );

          return {
            remove() {
              removedEvents.push(
                eventName as (typeof remoteEvents)[keyof typeof remoteEvents],
              );
            },
          };
        },
      },
      remoteEvents,
    });

    assert.deepEqual(
      [...listeners.keys()],
      [
        remoteEvents.play,
        remoteEvents.pause,
        remoteEvents.next,
        remoteEvents.previous,
      ],
    );

    await listeners.get(remoteEvents.next)?.();
    await listeners.get(remoteEvents.previous)?.();
    cleanup();

    assert.deepEqual(receivedCommands, ['next', 'previous']);
    assert.deepEqual(removedEvents, [
      remoteEvents.play,
      remoteEvents.pause,
      remoteEvents.next,
      remoteEvents.previous,
    ]);
  });

  it('adds queue navigation capabilities when a playlist session is active', async () => {
    const appliedOptions: unknown[] = [];
    const lifecycleCalls: string[] = [];
    const capability = {
      Pause: 'pause',
      Play: 'play',
      SeekTo: 'seek-to',
      SkipToNext: 'skip-to-next',
      SkipToPrevious: 'skip-to-previous',
      Stop: 'stop',
    } as unknown as SavedTrackPlayerModule['Capability'];

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
          Capability: capability,
        },
      },
    );

    assert.deepEqual(lifecycleCalls, ['ensurePlayerReady']);
    assert.deepEqual(appliedOptions, [
      {
        capabilities: [
          capability.Play,
          capability.Pause,
          capability.Stop,
          capability.SeekTo,
          capability.SkipToNext,
          capability.SkipToPrevious,
        ],
        compactCapabilities: [capability.Play, capability.Pause],
        notificationCapabilities: [
          capability.Play,
          capability.Pause,
          capability.Stop,
          capability.SeekTo,
          capability.SkipToNext,
          capability.SkipToPrevious,
        ],
      },
    ]);
  });
});
