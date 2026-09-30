/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createLoopPlayableItem,
  createTrackPlayableItem,
} from '@org/audio-library-models';

import type { PlaylistPlaybackSession } from '../../../playlists/utils/saved-playlist-playback-view-model.js';
import {
  PLAYABLE_SOURCE,
  SAVED_LOOP,
} from '../../../../test-utils/library-test-fixtures.js';
import type { SavedTrackPlaybackController } from '../../utils/saved-track-playback-controller/index.js';
import { startItemQueuePlayback } from './item-queue-playback-actions.js';

const ITEMS = [
  createTrackPlayableItem(PLAYABLE_SOURCE),
  createLoopPlayableItem(SAVED_LOOP, PLAYABLE_SOURCE),
];

// A controller fake whose load stays pending until the test settles it, like
// a slow web download; only the two methods the action calls are provided.
const createHarness = (options: { canLoad: boolean }) => {
  let settleLoad: ((loaded: boolean) => void) | null = null;
  const sessions: Array<PlaylistPlaybackSession | null> = [];
  const preparing: boolean[] = [];
  const issues: unknown[] = [];
  const controller = {
    canLoadPlayableItem() {
      return options.canLoad;
    },
    loadPlayableItem() {
      return new Promise<boolean>((resolve) => {
        settleLoad = resolve;
      });
    },
  } as unknown as SavedTrackPlaybackController;

  const start = () => {
    return startItemQueuePlayback({
      activePlaylistContextRef: { current: null },
      items: ITEMS,
      playbackController: controller,
      repeatMode: 'off',
      setActivePlaylistSession(next) {
        sessions.push(
          typeof next === 'function' ? next(sessions.at(-1) ?? null) : next,
        );
      },
      setIsPreparing(isPreparing) {
        preparing.push(isPreparing);
      },
      setIssue(issue) {
        issues.push(issue);
      },
    });
  };

  return {
    preparing,
    sessions,
    issues,
    settleLoad: (loaded: boolean) => {
      settleLoad?.(loaded);
    },
    start,
  };
};

describe('startItemQueuePlayback', () => {
  it('starts the queue before its first item finishes loading', async () => {
    const harness = createHarness({ canLoad: true });
    const started = harness.start();

    await Promise.resolve();

    assert.equal(harness.sessions.length, 1);
    assert.equal(harness.sessions[0]?.queue.items.length, ITEMS.length);
    assert.deepEqual(harness.preparing, [true]);

    harness.settleLoad(true);
    await started;

    assert.deepEqual(harness.preparing, [true, false]);
    assert.deepEqual(harness.issues, [null]);
  });

  it('keeps the previous session when loading cannot start', async () => {
    const harness = createHarness({ canLoad: false });

    await harness.start();

    assert.deepEqual(harness.sessions, []);
    assert.deepEqual(harness.preparing, []);
  });
});
