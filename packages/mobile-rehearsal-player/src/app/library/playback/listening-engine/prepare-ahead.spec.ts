import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource, PlayableItem } from '@org/audio-library-models';

import type { PlaylistPlaybackSession } from '../../playlists/utils/saved-playlist-playback-view-model';
import {
  createPrepareAhead,
  resolveTrackToPrepareAhead,
} from './prepare-ahead';

const source = (id: string) =>
  ({ id, mimeType: 'audio/mpeg' }) as DriveAudioSource;
const item = (trackId: string, overrides: Partial<PlayableItem> = {}) =>
  ({
    id: `item-${trackId}`,
    source: source(trackId),
    range: { startMs: 0 },
    ...overrides,
  }) as PlayableItem;
const session = (
  items: PlayableItem[],
  currentIndex = 0,
  repeatMode = 'off',
): PlaylistPlaybackSession =>
  ({
    currentIndex,
    hasCompleted: false,
    queue: { items, repeatMode },
  }) as unknown as PlaylistPlaybackSession;
const listening = { isMicrophoneOpen: true, isRecordingToolOpen: false };

describe('resolveTrackToPrepareAhead', () => {
  it('is the next track of the queue while a microphone is open', () => {
    const items = [item('t1'), item('t2')];

    assert.equal(
      resolveTrackToPrepareAhead({
        activeItem: items[0],
        session: session(items),
        ruleState: listening,
      })?.id,
      't2',
    );
  });

  it('is nothing without a microphone, without a queue, or at the end of one', () => {
    const items = [item('t1'), item('t2')];

    assert.equal(
      resolveTrackToPrepareAhead({
        activeItem: items[0],
        session: session(items),
        ruleState: { ...listening, isMicrophoneOpen: false },
      }),
      null,
    );
    assert.equal(
      resolveTrackToPrepareAhead({
        activeItem: items[0],
        session: null,
        ruleState: listening,
      }),
      null,
    );
    assert.equal(
      resolveTrackToPrepareAhead({
        activeItem: items[1],
        session: session(items, 1),
        ruleState: listening,
      }),
      null,
    );
  });

  it('is nothing when the next item is the same track or does not go on the engine', () => {
    const loopOfSame = [item('t1'), item('t1', { id: 'loop', loopId: 'l1' })];
    const recordingNext = [item('t1'), item('t2', { recordingId: 'r1' })];

    assert.equal(
      resolveTrackToPrepareAhead({
        activeItem: loopOfSame[0],
        session: session(loopOfSame),
        ruleState: listening,
      }),
      null,
    );
    assert.equal(
      resolveTrackToPrepareAhead({
        activeItem: recordingNext[0],
        session: session(recordingNext),
        ruleState: listening,
      }),
      null,
    );
  });
});

/** A `prepare` whose work ends when the spec says so. */
const setup = () => {
  const started: Array<{
    trackId: string;
    keep: readonly string[];
    signal: AbortSignal | undefined;
    finish: () => void;
  }> = [];
  const prepareAhead = createPrepareAhead(
    (track, options) =>
      new Promise<void>((resolve) => {
        started.push({
          trackId: track.id,
          keep: options?.keepTrackIds ?? [],
          signal: options?.signal,
          finish: resolve,
        });
      }),
  );
  const request = (activeTrackId: string | null, nextId: string | null) => ({
    accessToken: 'token',
    activeTrackId,
    next: nextId ? source(nextId) : null,
  });

  return { prepareAhead, request, started };
};
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('createPrepareAhead', () => {
  it('prepares the next track once, keeping the playing one', () => {
    const t = setup();

    t.prepareAhead.sync(t.request('t1', 't2'));
    t.prepareAhead.sync(t.request('t1', 't2'));

    assert.deepEqual(
      t.started.map(({ trackId, keep }) => [trackId, keep]),
      [['t2', ['t1']]],
    );
  });

  it('cancels a track that is no longer next and prepares the new one', () => {
    const t = setup();

    t.prepareAhead.sync(t.request('t1', 't2'));
    t.prepareAhead.sync(t.request('t1', 't3'));

    assert.equal(t.started[0].signal?.aborted, true);
    assert.deepEqual(
      t.started.map(({ trackId }) => trackId),
      ['t2', 't3'],
    );
  });

  it('lets a track finish when its turn came before it was ready, then prepares the one after', async () => {
    const t = setup();

    t.prepareAhead.sync(t.request('t1', 't2'));
    // The queue moved on: t2 is loading (and waiting for this work), t3 is next.
    t.prepareAhead.sync(t.request('t2', 't3'));

    assert.equal(t.started[0].signal?.aborted, false);
    assert.equal(t.started.length, 1);

    t.started[0].finish();
    await settle();

    assert.deepEqual(
      t.started.map(({ trackId }) => trackId),
      ['t2', 't3'],
    );
  });

  it('cancels when there is nothing to prepare any more', () => {
    const t = setup();

    t.prepareAhead.sync(t.request('t1', 't2'));
    t.prepareAhead.sync(t.request('t1', null));

    assert.equal(t.started[0].signal?.aborted, true);
    assert.equal(t.started.length, 1);
  });
});
