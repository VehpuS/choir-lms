import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pruneOrphanPreparedStems } from './prune-orphan-prepared-stems';
import { createPreparedStemStore } from './prepared-stem-store';
import { createMemoryPreparedStemsBackend } from './prepared-stem-test-support';

const SAMPLE_RATE = 8000;

const prepare = async (
  store: ReturnType<typeof createPreparedStemStore>,
  compositeId: string,
) => {
  const writer = await store.begin(
    { compositeId, stemId: 'stem-1', contentVersion: 'v1' },
    { sampleRate: SAMPLE_RATE },
  );

  await writer.write(Int16Array.of(1, 2));
  await writer.finish();
};

describe('pruneOrphanPreparedStems', () => {
  it('deletes the stems of unknown composites and keeps the known ones', async () => {
    const store = createPreparedStemStore(
      createMemoryPreparedStemsBackend().backend,
    );

    await prepare(store, 'kept');
    await prepare(store, 'gone');

    const pruned = await pruneOrphanPreparedStems(store, ['kept']);

    assert.deepEqual(pruned, ['gone']);
    assert.deepEqual(
      (await store.listComposites()).map(({ compositeId }) => compositeId),
      ['kept'],
    );
  });

  it('does nothing when every prepared composite is known', async () => {
    const store = createPreparedStemStore(
      createMemoryPreparedStemsBackend().backend,
    );

    await prepare(store, 'kept');

    assert.deepEqual(await pruneOrphanPreparedStems(store, ['kept']), []);
  });
});
