import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SAVE_FOLDER_KEY,
  rememberSaveFolder,
  restoreSaveFolder,
} from './save-folder-storage';

const createMemoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: async (key: string) => values.get(key) ?? null,
    removeItem: async (key: string) => {
      values.delete(key);
    },
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
};

const FOLDER = {
  path: [{ id: 'scores', name: 'Scores' }],
  rootKind: 'my-drive' as const,
};

describe('save folder storage', () => {
  it('restores the folder that was remembered', async () => {
    const storage = createMemoryStorage();

    await rememberSaveFolder(FOLDER, storage);

    assert.deepEqual(await restoreSaveFolder(storage), FOLDER);
  });

  it('restores nothing when no folder was stored', async () => {
    assert.equal(await restoreSaveFolder(createMemoryStorage()), undefined);
  });

  it('ignores stored values that are not a folder path', async () => {
    for (const stored of [
      'not json',
      '{"rootKind":"elsewhere","path":[]}',
      '{"rootKind":"my-drive","path":[{"id":"a"}]}',
      '[]',
    ]) {
      assert.equal(
        await restoreSaveFolder(
          createMemoryStorage({ [SAVE_FOLDER_KEY]: stored }),
        ),
        undefined,
        stored,
      );
    }
  });

  it('does not throw when storage fails', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('unavailable');
      },
      removeItem: async () => undefined,
      setItem: async () => {
        throw new Error('unavailable');
      },
    };

    assert.equal(await restoreSaveFolder(failing), undefined);
    await assert.doesNotReject(rememberSaveFolder(FOLDER, failing));
  });
});
