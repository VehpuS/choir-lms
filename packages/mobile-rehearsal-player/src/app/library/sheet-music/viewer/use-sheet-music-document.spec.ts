/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { SheetMusicSource } from '@org/audio-library-models';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type {
  SheetMusicLoadResult,
  SheetMusicLoader,
} from '../sheet-music-loader.js';
import {
  useSheetMusicDocument,
  type SheetMusicDocumentState,
} from './use-sheet-music-document.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const sourceOf = (id: string): SheetMusicSource => ({
  addedAt: '2026-01-01T00:00:00.000Z',
  format: 'pdf',
  id,
  label: id,
  location: { kind: 'url', url: `https://host.example/${id}.pdf` },
});

type Pending = {
  resolve: (result: SheetMusicLoadResult) => void;
  signal: AbortSignal | undefined;
  sourceId: string;
};

// A loader the spec controls: each load waits until the spec answers it, which
// stands in for the network, so ordering and cancellation can be exercised.
const createControlledLoader = () => {
  const pending: Pending[] = [];
  const loader: SheetMusicLoader = {
    load: (source, options) =>
      new Promise((resolve) => {
        pending.push({ resolve, signal: options?.signal, sourceId: source.id });
      }),
  };

  return { loader, pending };
};

const LOADED: SheetMusicLoadResult = {
  bytes: new Uint8Array([1]),
  format: 'pdf',
  isCompressed: false,
  status: 'loaded',
};

const renderHook = async (
  source: SheetMusicSource,
  loader: SheetMusicLoader,
) => {
  const box: {
    current: {
      retry: () => void;
      state: SheetMusicDocumentState;
    } | null;
    renderer: ReactTestRenderer | null;
  } = { current: null, renderer: null };
  const Harness = ({ item }: { item: SheetMusicSource }) => {
    box.current = useSheetMusicDocument(item, loader);

    return null;
  };

  await act(async () => {
    box.renderer = create(createElement(Harness, { item: source }));
  });

  const rerender = async (item: SheetMusicSource) => {
    await act(async () => {
      box.renderer?.update(createElement(Harness, { item }));
    });
  };

  return { box, rerender };
};

// Read through a function: TypeScript would otherwise narrow the state after
// the first assertion and reject the later ones.
const statusOf = (box: {
  current: { state: SheetMusicDocumentState } | null;
}) => box.current?.state.status;

describe('useSheetMusicDocument', () => {
  it('starts loading and shows the document once it arrives', async () => {
    const { loader, pending } = createControlledLoader();
    const { box } = await renderHook(sourceOf('a'), loader);

    assert.equal(statusOf(box), 'loading');
    assert.equal(pending.length, 1);

    await act(async () => pending[0]?.resolve(LOADED));

    assert.equal(statusOf(box), 'loaded');
  });

  it('shows the reason a load failed', async () => {
    const { loader, pending } = createControlledLoader();
    const { box } = await renderHook(sourceOf('a'), loader);

    await act(async () =>
      pending[0]?.resolve({ reason: 'blocked', status: 'failed' }),
    );

    assert.deepEqual(box.current?.state, {
      reason: 'blocked',
      status: 'failed',
    });
  });

  it('cancels the first request and ignores its late answer when the source changes', async () => {
    const { loader, pending } = createControlledLoader();
    const { box, rerender } = await renderHook(sourceOf('a'), loader);

    await rerender(sourceOf('b'));

    assert.equal(pending[0]?.signal?.aborted, true);
    assert.equal(pending[1]?.sourceId, 'b');

    // The cancelled request answers after the new one was asked for.
    await act(async () =>
      pending[0]?.resolve({ reason: 'offline', status: 'failed' }),
    );
    assert.equal(statusOf(box), 'loading');

    await act(async () => pending[1]?.resolve(LOADED));
    assert.equal(statusOf(box), 'loaded');
  });

  it('does not reload when only the source is renamed', async () => {
    const { loader, pending } = createControlledLoader();
    const { rerender } = await renderHook(sourceOf('a'), loader);

    await rerender({ ...sourceOf('a'), label: 'Renamed' });

    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.signal?.aborted, false);
  });

  it('asks again on retry and shows loading in between', async () => {
    const { loader, pending } = createControlledLoader();
    const { box } = await renderHook(sourceOf('a'), loader);

    await act(async () =>
      pending[0]?.resolve({ reason: 'offline', status: 'failed' }),
    );
    assert.equal(statusOf(box), 'failed');

    await act(async () => box.current?.retry());
    assert.equal(statusOf(box), 'loading');
    assert.equal(pending.length, 2);

    await act(async () => pending[1]?.resolve(LOADED));
    assert.equal(statusOf(box), 'loaded');
  });

  it('cancels the request when the viewer closes', async () => {
    const { loader, pending } = createControlledLoader();
    const { box } = await renderHook(sourceOf('a'), loader);

    await act(async () => {
      box.renderer?.unmount();
    });

    assert.equal(pending[0]?.signal?.aborted, true);
  });
});
