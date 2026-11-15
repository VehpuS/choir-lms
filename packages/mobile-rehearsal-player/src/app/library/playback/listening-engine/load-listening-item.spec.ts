import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createCompositePlayableItem,
  type PlayableItem,
} from '@org/audio-library-models';

import {
  clearActiveCompositeEngine,
  getActiveCompositeEngine,
  getActiveEngineKind,
} from '../../composite/playback/active-composite';
import { createTestEngine } from '../../composite/playback/composite-test-engine';
import { createAbortError } from '../utils/saved-track-blob-download';
import {
  loadItemOnListeningEngine,
  shouldPlayOnListeningEngine,
  type LoadListeningItemOptions,
} from './load-listening-item';

const trackItem = (overrides: Partial<PlayableItem> = {}): PlayableItem =>
  ({
    id: 'item-1',
    kind: 'track',
    title: 'Ubi caritas',
    sourceId: 't1',
    source: { id: 't1', mimeType: 'audio/mpeg' },
    range: { startMs: 0 },
    ...overrides,
  }) as PlayableItem;

const compositeItem = createCompositePlayableItem(
  {
    id: 'c1',
    name: 'Song',
    createdAt: 'now',
    stems: [{ id: 's1', trackId: 't1', name: 'S', offsetMs: 0, mine: false }],
  },
  { durationMs: 60_000 },
);

afterEach(() => clearActiveCompositeEngine());

const listening = { isMicrophoneOpen: true, isRecordingToolOpen: false };

describe('shouldPlayOnListeningEngine', () => {
  it('is for a track, a loop or an adjusted track while a microphone is open', () => {
    assert.equal(shouldPlayOnListeningEngine(trackItem(), listening), true);
    assert.equal(
      shouldPlayOnListeningEngine(trackItem({ loopId: 'loop-1' }), listening),
      true,
    );
  });

  it('is not without a microphone', () => {
    assert.equal(
      shouldPlayOnListeningEngine(trackItem(), {
        ...listening,
        isMicrophoneOpen: false,
      }),
      false,
    );
  });

  it('is not with the Recording tool open: recording follows the media element', () => {
    assert.equal(
      shouldPlayOnListeningEngine(trackItem(), {
        ...listening,
        isRecordingToolOpen: true,
      }),
      false,
    );
  });

  it('leaves a composite to its own load and a recording item on the media element', () => {
    assert.equal(shouldPlayOnListeningEngine(compositeItem, listening), false);
    assert.equal(
      shouldPlayOnListeningEngine(trackItem({ recordingId: 'r1' }), listening),
      false,
    );
  });
});

const load = (overrides: Partial<LoadListeningItemOptions> = {}) => {
  const test = createTestEngine(60_000);
  const calls: string[] = [];
  const fallbacks: unknown[] = [];
  const result = loadItemOnListeningEngine({
    item: trackItem(),
    accessToken: 'token',
    isMicrophoneOpen: true,
    isRecordingToolOpen: false,
    player: { reset: async () => void calls.push('reset') },
    loads: {
      supersede: () => undefined,
      load: async (track, options) => {
        calls.push(`load:${track.id}:${options.accessToken}`);

        return test.engine;
      },
    },
    volume: 0.5,
    initialPositionSeconds: 12,
    shouldPlay: true,
    applyShaping: async () => void calls.push('shape'),
    onFallback: (error) => fallbacks.push(error),
    ...overrides,
  });

  return { calls, fallbacks, result, test };
};

describe('loadItemOnListeningEngine', () => {
  it('makes the engine the player for the track: reset, load, shape, seek, play', async () => {
    const { calls, result, test } = load();

    assert.equal(await result, true);
    assert.deepEqual(calls, ['reset', 'load:t1:token', 'shape']);
    assert.equal(getActiveCompositeEngine(), test.engine);
    assert.equal(getActiveEngineKind(), 'track');
    assert.equal(test.engine.getPositionMs(), 12_000);
    assert.equal(test.engine.getState(), 'playing');
    assert.equal(test.engine.getVolume(), 0.5);
  });

  it('does nothing without a microphone, so the media element loads as usual', async () => {
    const { calls, result } = load({ isMicrophoneOpen: false });

    assert.equal(await result, false);
    assert.deepEqual(calls, []);
    assert.equal(getActiveCompositeEngine(), null);
  });

  it('falls back to the media element when the engine cannot be built, and says why', async () => {
    const failure = new Error('cannot decode');
    const { fallbacks, result } = load({
      loads: {
        supersede: () => undefined,
        load: async () => {
          throw failure;
        },
      },
    });

    assert.equal(await result, false);
    assert.deepEqual(fallbacks, [failure]);
    assert.equal(getActiveCompositeEngine(), null);
  });

  it('passes a superseded load on, so nothing else is loaded for it', async () => {
    const { fallbacks, result } = load({
      loads: {
        supersede: () => undefined,
        load: async () => {
          throw createAbortError();
        },
      },
    });

    await assert.rejects(result);
    assert.deepEqual(fallbacks, []);
  });
});
