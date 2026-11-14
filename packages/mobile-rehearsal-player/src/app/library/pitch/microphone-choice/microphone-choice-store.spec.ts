import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMicrophoneChoiceStore } from './microphone-choice-store';
import { MICROPHONE_CHOICE_KEY } from './microphone-choice-storage';

const createFakeStorage = (initial?: string) => {
  const records = new Map<string, string>();

  if (initial) {
    records.set(MICROPHONE_CHOICE_KEY, initial);
  }

  return {
    records,
    getItem: async (key: string) => records.get(key) ?? null,
    removeItem: async (key: string) => void records.delete(key),
    setItem: async (key: string, value: string) => void records.set(key, value),
  };
};

describe('microphone choice store', () => {
  it('asks each time until a stored choice is read', async () => {
    const store = createMicrophoneChoiceStore(createFakeStorage('automatic'));

    assert.equal(store.getSnapshot(), null);
    assert.deepEqual(await store.hydrate(), { kind: 'automatic' });
    assert.deepEqual(store.getSnapshot(), { kind: 'automatic' });
  });

  it('changes the choice, notifies subscribers and persists it', async () => {
    const storage = createFakeStorage();
    const store = createMicrophoneChoiceStore(storage);
    let notifications = 0;

    store.subscribe(() => {
      notifications += 1;
    });
    await store.set({ kind: 'input', input: { deviceId: 'b', label: 'Ear' } });

    assert.equal(store.getSnapshot()?.kind, 'input');
    assert.ok(storage.records.get(MICROPHONE_CHOICE_KEY)?.includes('"b"'));
    assert.ok(notifications >= 1);
  });

  it('clears the choice so the prompt returns', async () => {
    const storage = createFakeStorage('automatic');
    const store = createMicrophoneChoiceStore(storage);

    await store.set(null);

    assert.equal(store.getSnapshot(), null);
    assert.equal(storage.records.has(MICROPHONE_CHOICE_KEY), false);
  });

  it('is not overwritten by a read that finishes after a change', async () => {
    const storage = createFakeStorage('automatic');
    const store = createMicrophoneChoiceStore(storage);

    await store.set(null);
    await store.hydrate();

    assert.equal(store.getSnapshot(), null);
  });
});
