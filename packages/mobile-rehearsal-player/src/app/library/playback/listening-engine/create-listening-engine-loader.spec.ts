import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { DriveAudioSource } from '@org/audio-library-models';

import { createCompositeLoadStore } from '../../composite/loading/composite-load-state';
import { createTestEngine } from '../../composite/playback/composite-test-engine';
import {
  LISTENING_STEM_ID,
  listeningOwnerId,
} from '../../composite/prepared/prepared-owner';
import { createPreparedStemStore } from '../../composite/prepared/prepared-stem-store';
import { createMemoryPreparedStemsBackend } from '../../composite/prepared/prepared-stem-test-support';
import {
  createListeningEngineLoader,
  ListeningNoRoomError,
} from './create-listening-engine-loader';
import { toListeningLoadState } from './listening-load-state';

const RATE = 8000;
const BYTES_PER_SAMPLE = 2;
/** One second of decoded audio per track, so a prepared track is this big. */
const TRACK_BYTES = RATE * BYTES_PER_SAMPLE;

const track = (id: string, modifiedTime = 'v1'): DriveAudioSource =>
  ({
    id,
    provider: 'google-drive',
    driveFileId: `drive-${id}`,
    name: `${id}.mp3`,
    mimeType: 'audio/mpeg',
    modifiedTime,
    durationMs: 1000,
  }) as DriveAudioSource;

const setup = (
  overrides: Parameters<typeof createListeningEngineLoader>[0] = {},
) => {
  const memory = createMemoryPreparedStemsBackend();
  const clock = { now: 0 };
  const store = createPreparedStemStore(memory.backend, () => {
    clock.now += 1;

    return clock.now;
  });
  const built: Array<{ stems: string[]; gains: Record<string, number> }> = [];
  const fetched: string[] = [];
  const loadState = createCompositeLoadStore();
  // What the player would show, and a null once the load ends.
  const seen: Array<string | null> = [];

  loadState.subscribe(() =>
    seen.push(toListeningLoadState(loadState)?.phase ?? null),
  );

  const loader = createListeningEngineLoader({
    getContext: () => ({
      sampleRate: RATE,
      decodeAudioData: async () => ({
        numberOfChannels: 2,
        sampleRate: RATE,
        getChannelData: () => new Float32Array(RATE).fill(0.1),
      }),
    }),
    store,
    loadState,
    estimator: undefined,
    fetchBlob: async (source) => {
      fetched.push(source.id);

      return new Blob([source.id]);
    },
    createEngine: async (options) => {
      built.push({
        stems: options.stems.map((stem) => stem.id),
        gains: options.initialGains,
      });

      return createTestEngine().engine;
    },
    ...overrides,
  });
  const owners = async () =>
    (await store.listComposites()).map((owner) => owner.compositeId).sort();

  return { built, fetched, loader, memory, owners, seen, store };
};

describe('createListeningEngineLoader', () => {
  it('prepares the track the first time and builds a one-stem engine at full gain', async () => {
    const t = setup();

    await t.loader(track('t1'));

    assert.deepEqual(t.built, [
      { stems: [LISTENING_STEM_ID], gains: { [LISTENING_STEM_ID]: 1 } },
    ]);
    assert.deepEqual(t.fetched, ['t1']);
    assert.deepEqual(await t.owners(), [listeningOwnerId('t1')]);
    assert.deepEqual([t.seen[0], t.seen.at(-1)], ['preparing', null]);
  });

  it('opens a prepared track without fetching it again', async () => {
    const t = setup();

    await t.loader(track('t1'));
    t.seen.length = 0;
    await t.loader(track('t1'));

    assert.deepEqual(t.fetched, ['t1']);
    assert.equal(t.seen[0], 'loading');
    assert.equal(t.built.length, 2);
  });

  it("prepares again when the track's audio changed", async () => {
    const t = setup();

    await t.loader(track('t1', 'v1'));
    await t.loader(track('t1', 'v2'));

    assert.deepEqual(t.fetched, ['t1', 't1']);
    assert.equal(t.memory.recordIds().length, 1);
  });

  it('removes the least recently played track to stay in the budget, never a kept one', async () => {
    const t = setup({ budgetBytes: 2 * TRACK_BYTES });

    await t.loader(track('old'));
    await t.loader(track('playing'));
    // Playing `old` again makes `playing` the least recently used.
    await t.loader(track('old'));
    await t.loader(track('new'), { keepTrackIds: ['playing'] });

    assert.deepEqual(
      await t.owners(),
      [listeningOwnerId('new'), listeningOwnerId('playing')].sort(),
    );
  });

  it('says there is no room when the browser reports too little, and prepares nothing', async () => {
    const t = setup({
      estimator: { estimate: async () => ({ quota: 100, usage: 90 }) },
    });

    await assert.rejects(t.loader(track('t1')), ListeningNoRoomError);
    assert.deepEqual(t.fetched, []);
    assert.deepEqual(await t.owners(), []);
  });

  it('says there is no room when a write fails for lack of space, leaving nothing half-written', async () => {
    const t = setup();

    t.memory.failNextAppends(1);

    await assert.rejects(t.loader(track('t1')), ListeningNoRoomError);
    assert.deepEqual(await t.owners(), []);
    assert.equal(t.seen.at(-1), null);
  });

  it('fails without a context, before touching the store', async () => {
    const t = setup({ getContext: () => null });

    await assert.rejects(t.loader(track('t1')));
    assert.deepEqual(t.fetched, []);
  });

  it('stops when the load is superseded', async () => {
    const t = setup();
    const controller = new AbortController();

    controller.abort();

    await assert.rejects(t.loader(track('t1'), { signal: controller.signal }));
    assert.equal(t.built.length, 0);
  });
});
