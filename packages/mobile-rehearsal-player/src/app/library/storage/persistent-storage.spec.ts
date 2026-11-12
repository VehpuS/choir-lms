import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createPersistentStorage,
  type StorageManagerLike,
} from './persistent-storage';

const managerThatAnswers = (
  answer: boolean,
  options: { alreadyPersisted?: boolean } = {},
) => {
  const calls = { persist: 0 };
  const manager: StorageManagerLike = {
    persist: async () => {
      calls.persist += 1;

      return answer;
    },
    persisted: async () => options.alreadyPersisted ?? false,
  };

  return { calls, manager };
};

describe('createPersistentStorage', () => {
  it('starts unknown and records a grant', async () => {
    const { manager } = managerThatAnswers(true);
    const storage = createPersistentStorage(() => manager);

    assert.equal(storage.getStatus(), 'unknown');
    assert.equal(await storage.request(), 'granted');
    assert.equal(storage.getStatus(), 'granted');
  });

  it('records a refusal as a status, not an error', async () => {
    const storage = createPersistentStorage(
      () => managerThatAnswers(false).manager,
    );

    assert.equal(await storage.request(), 'denied');
  });

  it('asks the browser once however often it is called', async () => {
    const { calls, manager } = managerThatAnswers(true);
    const storage = createPersistentStorage(() => manager);

    await Promise.all([storage.request(), storage.request()]);
    await storage.request();

    assert.equal(calls.persist, 1);
  });

  it('does not ask again when storage is already persistent', async () => {
    const { calls, manager } = managerThatAnswers(false, {
      alreadyPersisted: true,
    });
    const storage = createPersistentStorage(() => manager);

    assert.equal(await storage.request(), 'granted');
    assert.equal(calls.persist, 0);
  });

  it('reports unsupported where there is no storage manager', async () => {
    const storage = createPersistentStorage(() => undefined);

    assert.equal(await storage.request(), 'unsupported');
  });

  it('treats a throwing request as a refusal', async () => {
    const storage = createPersistentStorage(() => ({
      persist: async () => {
        throw new Error('blocked');
      },
    }));

    assert.equal(await storage.request(), 'denied');
  });

  it('tells subscribers when the answer arrives', async () => {
    const storage = createPersistentStorage(
      () => managerThatAnswers(true).manager,
    );
    let notified = 0;

    storage.subscribe(() => {
      notified += 1;
    });
    await storage.request();

    assert.equal(notified, 1);
  });
});
