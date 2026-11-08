import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DIFFERENT_LENGTH_LINE,
  resolveMakeCompositeSelection,
  SAME_LENGTH_LINE,
} from './make-composite-selection';
import type { BulkSelectionItem } from './playback-expansion';

const track = (id: string): BulkSelectionItem => ({
  entityId: id,
  key: `track:${id}`,
  kind: 'track',
});
const sources = (durations: Record<string, number | undefined>) =>
  Object.entries(durations).map(([id, durationMs]) => ({ id, durationMs }));

const resolve = (
  ids: string[],
  durations: Record<string, number | undefined>,
  canMakeComposite = true,
) =>
  resolveMakeCompositeSelection({
    canMakeComposite,
    items: ids.map(track),
    sources: sources(durations),
  });

describe('resolveMakeCompositeSelection', () => {
  it('emphasises the action and says so when every track is the same length', () => {
    const result = resolve(['a', 'b', 'c', 'd'], {
      a: 200_000,
      b: 200_400,
      c: 199_800,
      d: 200_000,
    });

    assert.deepEqual(result.offer, { emphasised: true });
    assert.equal(result.lengthLine, SAME_LENGTH_LINE);
    assert.deepEqual(result.trackIds, ['a', 'b', 'c', 'd']);
  });

  it('offers the action plainly, and says the lengths differ, when they do', () => {
    const result = resolve(['a', 'b'], { a: 200_000, b: 190_000 });

    assert.deepEqual(result.offer, { emphasised: false });
    assert.equal(result.lengthLine, DIFFERENT_LENGTH_LINE);
  });

  it('treats a difference of exactly one second as the same length', () => {
    const result = resolve(['a', 'b'], { a: 200_000, b: 201_000 });

    assert.equal(result.offer?.emphasised, true);
  });

  it('does not offer the action for one track', () => {
    assert.equal(resolve(['a'], { a: 1000 }).offer, null);
    assert.equal(resolve([], {}).offer, null);
  });

  it('does not offer the action where composites cannot be made', () => {
    const result = resolve(['a', 'b'], { a: 1000, b: 1000 }, false);

    assert.equal(result.offer, null);
    assert.equal(result.lengthLine, null);
  });

  it('does not offer the action for a selection that is not only tracks', () => {
    const result = resolveMakeCompositeSelection({
      canMakeComposite: true,
      items: [
        track('a'),
        track('b'),
        { folderId: 'f', key: 'folder:f', kind: 'folder' },
      ],
      sources: sources({ a: 1000, b: 1000 }),
    });

    assert.equal(result.offer, null);
  });

  it('offers it plainly with no line while a duration is not known yet', () => {
    const result = resolve(['a', 'b'], { a: 1000, b: undefined });

    assert.deepEqual(result.offer, { emphasised: false });
    assert.equal(result.lengthLine, null);
  });
});
