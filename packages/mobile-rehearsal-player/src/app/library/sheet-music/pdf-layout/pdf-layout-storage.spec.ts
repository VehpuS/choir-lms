import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  PDF_LAYOUT_KEY,
  persistPdfLayout,
  restorePdfLayout,
} from './pdf-layout-storage.js';

const memoryStorage = (initial: Record<string, string> = {}) => {
  const values = new Map(Object.entries(initial));

  return {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    values,
  };
};

describe('pdf layout storage', () => {
  it('restores a saved layout', async () => {
    const storage = memoryStorage({ [PDF_LAYOUT_KEY]: 'strip' });

    assert.equal(await restorePdfLayout(storage), 'strip');
  });

  it('defaults to scroll when nothing is stored', async () => {
    assert.equal(await restorePdfLayout(memoryStorage()), 'scroll');
  });

  it('ignores an unknown stored value', async () => {
    const storage = memoryStorage({ [PDF_LAYOUT_KEY]: 'carousel' });

    assert.equal(await restorePdfLayout(storage), 'scroll');
  });

  it('falls back to scroll when reading fails', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('storage unavailable');
      },
      setItem: async () => undefined,
    };

    assert.equal(await restorePdfLayout(failing), 'scroll');
  });

  it('persists the layout so it restores next time', async () => {
    const storage = memoryStorage();

    await persistPdfLayout('pages', storage);

    assert.equal(storage.values.get(PDF_LAYOUT_KEY), 'pages');
    assert.equal(await restorePdfLayout(storage), 'pages');
  });

  it('keeps going when writing fails', async () => {
    const failing = {
      getItem: async () => null,
      setItem: async () => {
        throw new Error('storage unavailable');
      },
    };

    await assert.doesNotReject(persistPdfLayout('strip', failing));
  });
});
