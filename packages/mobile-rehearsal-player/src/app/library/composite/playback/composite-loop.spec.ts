import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import { act, cleanup, renderHook } from '@testing-library/react-native/pure';

import {
  createCompositePlayableItem,
  createLoopPlayableItem,
  createTrackPlayableItem,
  createDriveAudioSource,
  type PlayableItem,
  type RepeatMode,
} from '@org/audio-library-models';

import {
  clearActiveCompositeEngine,
  setActiveCompositeEngine,
} from './active-composite.js';
import { resolveCompositeLoop } from './composite-loop.js';
import { createTestEngine } from './composite-test-engine.js';
import { useCompositeLoopSync } from './use-composite-loop.js';

afterEach(() => {
  cleanup();
  clearActiveCompositeEngine();
});

const composite = {
  id: 'c1',
  name: 'Ubi caritas',
  createdAt: 'now',
  stems: [
    { id: 's1', trackId: 't1', name: 'S', offsetMs: 0, mine: false },
    { id: 's2', trackId: 't2', name: 'B', offsetMs: 0, mine: false },
  ],
};
const wholeItem = createCompositePlayableItem(composite, {
  durationMs: 120_000,
});
const loopItem = createLoopPlayableItem(
  {
    id: 'l1',
    name: 'Bar 5',
    sourceId: 'c1',
    sourceName: 'Ubi caritas',
    startMs: 65_000,
    endMs: 95_000,
    createdAt: 'now',
  } as never,
  wholeItem.source,
);
const trackItem = createTrackPlayableItem(
  createDriveAudioSource({
    driveFileId: 'd1',
    name: 'Song',
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
  } as Parameters<typeof createDriveAudioSource>[0]),
);

const loopFor = (
  item: PlayableItem | null,
  repeatMode: RepeatMode,
  isInPlaylistSession = false,
) => resolveCompositeLoop({ item, repeatMode, isInPlaylistSession });

describe('resolveCompositeLoop', () => {
  it('loops the range of a loop of a composite while it repeats', () => {
    assert.deepEqual(loopFor(loopItem, 'one'), {
      startMs: 65_000,
      endMs: 95_000,
    });
  });

  it('loops a whole composite from the start to its end', () => {
    assert.deepEqual(loopFor(wholeItem, 'one'), { startMs: 0, endMs: 120_000 });
  });

  it('does not loop without repeat, or in a playlist, or for a track', () => {
    assert.equal(loopFor(loopItem, 'off'), null);
    assert.equal(loopFor(loopItem, 'all'), null);
    assert.equal(loopFor(loopItem, 'one', true), null);
    assert.equal(loopFor(trackItem, 'one'), null);
    assert.equal(loopFor(null, 'one'), null);
  });

  it('does not loop a composite whose length is not known', () => {
    assert.equal(loopFor(createCompositePlayableItem(composite), 'one'), null);
  });
});

describe('useCompositeLoopSync', () => {
  it('sets the loop when the engine becomes active and clears it when repeat ends', () => {
    const test = createTestEngine();
    const { rerender } = renderHook(
      (props: { repeatMode: RepeatMode }) =>
        useCompositeLoopSync({
          item: loopItem,
          repeatMode: props.repeatMode,
          isInPlaylistSession: false,
        }),
      { initialProps: { repeatMode: 'one' as RepeatMode } },
    );

    assert.deepEqual(test.calls, []);

    act(() => setActiveCompositeEngine(test.engine));
    assert.deepEqual(test.state.loop, { startMs: 65_000, endMs: 95_000 });

    rerender({ repeatMode: 'off' });
    assert.equal(test.state.loop, null);
  });
});
