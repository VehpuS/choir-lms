/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  createLoopPlayableItem,
  createTrackPlayableItem,
  type NamedLoop,
  type PlayableItem,
} from '@org/audio-library-models';

import { createSavedTrackMarkerJumpCommand } from './marker-jump-command.js';
import type { SavedTrackPlaybackControllerOptions } from './shared.js';

const track = createDriveAudioSource({
  driveFileId: 'kyrie',
  name: 'Kyrie.mp3',
  mimeType: 'audio/mpeg',
  durationMs: 240_000,
  availability: { status: 'available' },
});
const trackItem = createTrackPlayableItem(track);
const loopItem = createLoopPlayableItem(
  {
    id: 'loop-1',
    name: 'Verse 2',
    sourceId: track.id,
    sourceName: track.name,
    startMs: 60_000,
    endMs: 90_000,
  } as NamedLoop,
  track,
);

// Lightweight fakes for the runtime: the command only decides between a seek
// and a load, so the calls it makes are what the scenarios observe.
const createHarness = (options: {
  active: PlayableItem | null;
  canLoad?: boolean;
  seekFails?: boolean;
}) => {
  const calls: string[] = [];
  const loads: Array<{ item: PlayableItem; initial?: number; play?: boolean }> =
    [];
  const issues: unknown[] = [];
  const controllerOptions = {
    authState: { accessToken: 'token', scope: 's', status: 'authorized' },
    activePlayableItemRef: { current: options.active },
    setActivePlaylistSession: () => calls.push('leave-queue'),
    setIsPreparing: (value: boolean) => calls.push(`preparing:${value}`),
    setIssue: (value: unknown) => {
      if (value) {
        issues.push(value);
      }
    },
  } as unknown as SavedTrackPlaybackControllerOptions;
  const jump = createSavedTrackMarkerJumpCommand(
    controllerOptions,
    {
      canLoadPlayableItem: () => options.canLoad ?? true,
      loadPlayableItemIntoPlayer: async (item, _token, loadOptions) => {
        loads.push({
          item,
          initial: loadOptions?.initialPositionSeconds,
          play: loadOptions?.shouldPlay,
        });
        return item;
      },
      seekActivePlayableItemTo: async (_item, seconds) => {
        if (options.seekFails) {
          throw new Error('seek failed');
        }

        calls.push(`seek:${seconds}`);
      },
    },
    { startNewPlayback: () => calls.push('new-playback') },
  );

  return { calls, issues, jump, loads };
};

describe('jumpToMarker', () => {
  it('seeks without loading when the owner is loaded, whatever its play state', async () => {
    const { calls, jump, loads } = createHarness({ active: trackItem });

    assert.equal(await jump(trackItem, 120_000), 'seeked');
    assert.deepEqual(calls, ['seek:120']);
    assert.deepEqual(loads, []);
  });

  it('loads the item and starts playing from the marker when nothing is loaded', async () => {
    const { calls, jump, loads } = createHarness({ active: null });

    assert.equal(await jump(trackItem, 45_000), 'started');
    assert.deepEqual(loads, [{ item: trackItem, initial: 45, play: true }]);
    assert.deepEqual(calls, [
      'leave-queue',
      'new-playback',
      'preparing:true',
      'preparing:false',
    ]);
  });

  it('clamps inside the loop in a loop context', async () => {
    const { jump, loads } = createHarness({ active: null });

    await jump(loopItem, 95_000);

    assert.equal(loads[0]?.initial, 90);
  });

  it('refuses a past-end marker without touching the player', async () => {
    const { calls, jump, loads } = createHarness({ active: trackItem });

    assert.equal(await jump(trackItem, 300_000), 'past-end');
    assert.deepEqual(calls, []);
    assert.deepEqual(loads, []);
  });

  it('does not load when playback is blocked by an issue', async () => {
    const { jump, loads } = createHarness({ active: null, canLoad: false });

    assert.equal(await jump(trackItem, 1_000), 'blocked');
    assert.deepEqual(loads, []);
  });

  it('reports a failed seek as an issue instead of throwing', async () => {
    const { issues, jump } = createHarness({
      active: trackItem,
      seekFails: true,
    });

    assert.equal(await jump(trackItem, 1_000), 'blocked');
    assert.equal(issues.length, 1);
  });
});
