import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildRecordingFixture } from './recording-fixtures.js';
import { createRecordingsStore } from './recordings-store.js';
import { createMemoryRecordingsBackend } from './recordings-test-support.js';

const setup = () => {
  const memory = createMemoryRecordingsBackend();

  return { ...memory, store: createRecordingsStore(memory.backend) };
};

const take = () => buildRecordingFixture({ id: '1', durationMs: 0 });

describe('recovering an interrupted take', () => {
  it('finishes a take with saved audio from its last checkpoint', async () => {
    const { store } = setup();

    await store.create(take());
    await store.appendChunk('1', Int16Array.of(1, 2, 3, 4), {
      durationMs: 500,
      timeline: [],
    });

    const recovered = await store.recoverIncomplete('1');

    assert.equal(recovered?.durationMs, 500);
    assert.deepEqual(await store.listIncomplete(), []);
    assert.deepEqual(
      (await store.list()).map((recording) => recording.id),
      ['1'],
    );
  });

  it('removes a take that saved no audio', async () => {
    const { store } = setup();

    await store.create(take());

    assert.equal(await store.recoverIncomplete('1'), null);
    assert.deepEqual(await store.listIncomplete(), []);
    assert.deepEqual(await store.list(), []);
  });

  it('leaves a finished recording alone', async () => {
    const { store } = setup();

    await store.create(take());
    await store.appendChunk('1', Int16Array.of(1, 2), {
      durationMs: 250,
      timeline: [],
    });
    await store.complete(buildRecordingFixture({ id: '1', durationMs: 250 }));

    assert.equal(await store.recoverIncomplete('1'), null);
    assert.equal((await store.list()).length, 1);
  });
});
