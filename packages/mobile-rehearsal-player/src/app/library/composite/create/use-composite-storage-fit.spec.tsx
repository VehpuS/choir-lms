/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { StorageFit } from '@org/audio-library-models';
import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { useCompositeStorageFit } from './use-composite-storage-fit';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const THREE_MINUTES_MS = 180_000;
const TRACKS = [
  { id: 'a', name: 'A', durationMs: THREE_MINUTES_MS },
  { id: 'b', name: 'B', durationMs: THREE_MINUTES_MS },
];
const FULL = { quota: 1_000, usage: 999 };
const ROOMY = { quota: 10_000_000_000, usage: 0 };

describe('useCompositeStorageFit', () => {
  it('reads the room again when room was freed (the retry after Clear offline files)', async () => {
    // A fake browser estimate that the test frees up between two checks.
    let reading = FULL;
    const estimator = { estimate: async () => reading };
    const result: { current: StorageFit | null } = { current: null };
    const Probe = ({ token }: { token: number }) => {
      result.current = useCompositeStorageFit(TRACKS, estimator, token);

      return null;
    };
    let renderer: ReturnType<typeof create>;

    await act(async () => {
      renderer = create(createElement(Probe, { token: 0 }));
    });
    assert.equal(result.current, 'does-not-fit');

    reading = ROOMY;
    await act(async () => {
      renderer.update(createElement(Probe, { token: 1 }));
    });
    assert.equal(result.current, 'fits');
  });
});
