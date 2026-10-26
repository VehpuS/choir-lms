/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createSavedTrackAudioCache } from './saved-track-audio-cache.js';

const blobOf = (size: number) => new Blob(['x'.repeat(size)]);

describe('saved track audio cache', () => {
  it('returns the bytes stored for a file at the same version', () => {
    const cache = createSavedTrackAudioCache(100);
    const blob = blobOf(10);

    cache.set('file-a', 'v1', blob);

    assert.equal(cache.get('file-a', 'v1'), blob);
    assert.equal(cache.sizeBytes(), 10);
  });

  it('drops an entry when Drive reports a different version', () => {
    const cache = createSavedTrackAudioCache(100);

    cache.set('file-a', 'v1', blobOf(10));

    assert.equal(cache.get('file-a', 'v2'), null);
    assert.equal(cache.get('file-a', 'v1'), null);
    assert.equal(cache.sizeBytes(), 0);
  });

  it('evicts the least recently used file once over budget', () => {
    const cache = createSavedTrackAudioCache(25);

    cache.set('file-a', 'v1', blobOf(10));
    cache.set('file-b', 'v1', blobOf(10));
    // Reading a makes b the least recently used.
    cache.get('file-a', 'v1');
    cache.set('file-c', 'v1', blobOf(10));

    assert.notEqual(cache.get('file-a', 'v1'), null);
    assert.equal(cache.get('file-b', 'v1'), null);
    assert.notEqual(cache.get('file-c', 'v1'), null);
    assert.equal(cache.sizeBytes(), 20);
  });

  it('does not keep a file larger than the whole budget', () => {
    const cache = createSavedTrackAudioCache(10);

    cache.set('file-a', 'v1', blobOf(11));

    assert.equal(cache.get('file-a', 'v1'), null);
    assert.equal(cache.sizeBytes(), 0);
  });
});
