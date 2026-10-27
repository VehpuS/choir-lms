import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { AudioStoreEntry } from '../playback/audio-cache/audio-store-types';
import { getForgetSessionPrompt } from './forget-session-prompt.js';

const MEGABYTE = 1024 * 1024;
const entry = (id: string, sizeBytes: number): AudioStoreEntry => ({
  driveFileId: id,
  sizeBytes,
  sourceVersion: 'v1',
  touchedAt: 1,
});

describe('forget session prompt', () => {
  it('asks nothing when no file is stored', () => {
    assert.equal(getForgetSessionPrompt([]), null);
  });

  it('names the file count and total size, kept or not', () => {
    const prompt = getForgetSessionPrompt([
      entry('a', 3 * MEGABYTE),
      { ...entry('b', MEGABYTE), pinned: true },
    ]);

    assert.match(prompt?.message ?? '', /2 files \(4\.0 MB\) stored offline/);
  });

  it('uses the singular for one file', () => {
    assert.match(
      getForgetSessionPrompt([entry('a', MEGABYTE)])?.message ?? '',
      /^1 file \(/,
    );
  });
});
