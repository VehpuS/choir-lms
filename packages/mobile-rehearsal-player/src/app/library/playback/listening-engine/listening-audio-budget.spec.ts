import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listeningOwnerId } from '../../composite/prepared/prepared-owner';
import { createPreparedStemStore } from '../../composite/prepared/prepared-stem-store';
import { createMemoryPreparedStemsBackend } from '../../composite/prepared/prepared-stem-test-support';
import {
  makeRoomForListeningAudio,
  planListeningEviction,
} from './listening-audio-budget';

const entry = (ownerId: string, sizeBytes: number, lastUsedAt?: number) => ({
  ownerId,
  sizeBytes,
  lastUsedAt,
});

describe('planListeningEviction', () => {
  it('removes nothing while the incoming audio fits', () => {
    assert.deepEqual(
      planListeningEviction({
        entries: [entry('a', 40, 1), entry('b', 40, 2)],
        budgetBytes: 100,
        incomingBytes: 20,
        keepOwnerIds: [],
      }),
      [],
    );
  });

  it('removes the least recently used first, and only as many as needed', () => {
    assert.deepEqual(
      planListeningEviction({
        entries: [
          entry('new', 40, 30),
          entry('old', 40, 10),
          entry('mid', 40, 20),
        ],
        budgetBytes: 100,
        incomingBytes: 30,
        keepOwnerIds: [],
      }),
      ['old', 'mid'],
    );
  });

  it('never removes a kept owner, even the oldest', () => {
    assert.deepEqual(
      planListeningEviction({
        entries: [entry('playing', 60, 1), entry('other', 60, 2)],
        budgetBytes: 100,
        incomingBytes: 0,
        keepOwnerIds: ['playing'],
      }),
      ['other'],
    );
  });

  it('treats an entry with no recorded use as the oldest', () => {
    assert.deepEqual(
      planListeningEviction({
        entries: [entry('dated', 60, 5), entry('undated', 60)],
        budgetBytes: 100,
        incomingBytes: 0,
        keepOwnerIds: [],
      }),
      ['undated'],
    );
  });

  it('removes everything else when the kept audio alone is over the budget', () => {
    assert.deepEqual(
      planListeningEviction({
        entries: [entry('playing', 150, 9), entry('other', 10, 1)],
        budgetBytes: 100,
        incomingBytes: 0,
        keepOwnerIds: ['playing'],
      }),
      ['other'],
    );
  });
});

describe('makeRoomForListeningAudio', () => {
  const SAMPLE_RATE = 8000;
  const BYTES_PER_SAMPLE = 2;

  const setup = () => {
    const clock = { now: 0 };
    const store = createPreparedStemStore(
      createMemoryPreparedStemsBackend().backend,
      () => clock.now,
    );
    const prepare = async (ownerId: string, samples: number, atMs: number) => {
      clock.now = atMs;

      const writer = await store.begin(
        { compositeId: ownerId, stemId: 'stem', contentVersion: 'v1' },
        { sampleRate: SAMPLE_RATE },
      );

      await writer.write(new Int16Array(samples));
      await writer.finish();
    };

    return { prepare, store };
  };

  it('deletes the oldest listening audio and never a composite, however old', async () => {
    const { prepare, store } = setup();

    await prepare('composite-1', 100, 1);
    await prepare(listeningOwnerId('old'), 10, 2);
    await prepare(listeningOwnerId('new'), 10, 3);

    const removed = await makeRoomForListeningAudio(store, {
      incomingBytes: 10 * BYTES_PER_SAMPLE,
      keepOwnerIds: [],
      budgetBytes: 20 * BYTES_PER_SAMPLE,
    });

    assert.deepEqual(removed, [listeningOwnerId('old')]);
    assert.deepEqual(
      (await store.listComposites()).map((owner) => owner.compositeId).sort(),
      ['composite-1', listeningOwnerId('new')].sort(),
    );
  });
});
