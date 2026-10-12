/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { PlayableItem } from '@org/audio-library-models';

import {
  isLoopPreviewItem,
  resolvePreviewRangeSync,
} from './loop-preview-item.js';

const previewItem = (startMs: number, endMs: number) =>
  ({
    id: 'loop-preview:drive:a',
    range: { endMs, startMs },
  }) as PlayableItem;

describe('isLoopPreviewItem', () => {
  it('recognizes the editor preview ids and nothing else', () => {
    assert.equal(
      isLoopPreviewItem({ id: 'loop-preview:drive:a:0:5000' }),
      true,
    );
    assert.equal(isLoopPreviewItem({ id: 'loop:drive:a:2026' }), false);
    assert.equal(isLoopPreviewItem({ id: 'track:drive:a' }), false);
  });
});

describe('resolvePreviewRangeSync', () => {
  const active = previewItem(10_000, 20_000);

  it('does nothing when the range is unchanged or another item plays', () => {
    assert.deepEqual(
      resolvePreviewRangeSync({
        active,
        playbackPositionSeconds: 12,
        preview: previewItem(10_000, 20_000),
      }),
      { seekToSeconds: null, shouldUpdate: false },
    );
    assert.deepEqual(
      resolvePreviewRangeSync({
        active: { ...active, id: 'track:drive:a' } as PlayableItem,
        playbackPositionSeconds: 12,
        preview: previewItem(5_000, 20_000),
      }),
      { seekToSeconds: null, shouldUpdate: false },
    );
  });

  it('keeps playing from the same spot while the playhead stays inside the new range', () => {
    assert.deepEqual(
      resolvePreviewRangeSync({
        active,
        playbackPositionSeconds: 15,
        preview: previewItem(12_000, 30_000),
      }),
      { seekToSeconds: null, shouldUpdate: true },
    );
  });

  it('moves the playhead to the new start when it falls outside the new range', () => {
    assert.deepEqual(
      resolvePreviewRangeSync({
        active,
        playbackPositionSeconds: 11,
        preview: previewItem(14_000, 30_000),
      }),
      { seekToSeconds: 14, shouldUpdate: true },
    );
    assert.deepEqual(
      resolvePreviewRangeSync({
        active,
        playbackPositionSeconds: 19,
        preview: previewItem(5_000, 18_000),
      }),
      { seekToSeconds: 5, shouldUpdate: true },
    );
  });
});
