import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_LYRICS_TEXT_SIZE,
  parseLyricsTextSize,
  persistLyricsTextSize,
  resolveLyricsTextStyle,
  restoreLyricsTextSize,
  stepLyricsTextSize,
  LYRICS_TEXT_SIZES,
} from './lyrics-text-size.js';

const memoryStorage = (initial?: string) => {
  let stored = initial ?? null;

  return {
    getItem: async () => stored,
    setItem: async (_key: string, value: string) => {
      stored = value;
    },
  };
};

describe('lyrics text size preference', () => {
  it('defaults to medium and ignores unknown stored values', async () => {
    assert.equal(await restoreLyricsTextSize(memoryStorage()), 'medium');
    assert.equal(await restoreLyricsTextSize(memoryStorage('huge')), 'medium');
    assert.equal(parseLyricsTextSize(undefined), DEFAULT_LYRICS_TEXT_SIZE);
  });

  it('round-trips each size', async () => {
    for (const size of LYRICS_TEXT_SIZES) {
      const storage = memoryStorage();

      await persistLyricsTextSize(size, storage);
      assert.equal(await restoreLyricsTextSize(storage), size);
    }
  });

  it('falls back to the default when storage fails', async () => {
    const failing = {
      getItem: async () => {
        throw new Error('unavailable');
      },
      setItem: async () => {
        throw new Error('unavailable');
      },
    };

    assert.equal(await restoreLyricsTextSize(failing), 'medium');
    await persistLyricsTextSize('large', failing);
  });

  it('steps one size at a time and stops at the ends', () => {
    assert.equal(stepLyricsTextSize('medium', 'larger'), 'large');
    assert.equal(stepLyricsTextSize('extra-large', 'larger'), 'extra-large');
    assert.equal(stepLyricsTextSize('small', 'smaller'), 'small');
  });

  it('has a theme text style for every size', () => {
    for (const size of LYRICS_TEXT_SIZES) {
      assert.ok(resolveLyricsTextStyle(size).fontSize > 0);
    }
  });
});
