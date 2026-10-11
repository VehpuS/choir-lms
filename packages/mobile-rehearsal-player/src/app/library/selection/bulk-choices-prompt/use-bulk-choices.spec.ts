/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { act, create } from 'react-test-renderer';

import { createBulkChoicePreferencesStore } from '../bulk-choice-preferences-store.js';
import type {
  BulkSelectionItem,
  PlaybackExpansionContext,
  PlaybackExpansionOptions,
} from '../playback-expansion.js';
import { useBulkChoicesController } from './use-bulk-choices-controller.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// A folder holding a playlist link and a repeated track, like the browser
// pass in the task: one playlists question and one repeats question arise.
const context: PlaybackExpansionContext = {
  getFolderChildren: () => [
    { entityId: 'a', kind: 'track' },
    { entityId: 'p', kind: 'playlist' },
  ],
  getPlaylistRefs: () => [{ entityId: 'a', kind: 'track' }],
};
const items: BulkSelectionItem[] = [
  { folderId: 'f', key: 'k', kind: 'folder' },
];
const plainItems: BulkSelectionItem[] = [
  { entityId: 'a', key: 'k', kind: 'track' },
];

const mountHook = async (
  store: ReturnType<typeof createBulkChoicePreferencesStore>,
) => {
  const hook: { current: ReturnType<typeof useBulkChoicesController> | null } =
    {
      current: null,
    };
  const Harness = () => {
    hook.current = useBulkChoicesController(store);
    return null;
  };

  await act(async () => {
    create(createElement(Harness));
  });

  return {
    getRequest: () => hook.current?.request ?? null,
    cancel: () => hook.current?.cancel(),
    confirm: (
      result: Parameters<NonNullable<typeof hook.current>['confirm']>[0],
    ) => hook.current?.confirm(result),
    resolveChoices: (
      selection: BulkSelectionItem[],
    ): Promise<PlaybackExpansionOptions | null> =>
      hook.current?.resolveChoices(selection, context) ?? Promise.resolve(null),
  };
};

// A lightweight in-memory fake for the AsyncStorage surface the store uses.
const createHarnessStore = () => {
  const records = new Map<string, string>();
  const store = createBulkChoicePreferencesStore({
    getItem: async (key) => records.get(key) ?? null,
    removeItem: async (key) => void records.delete(key),
    setItem: async (key, value) => void records.set(key, value),
  });

  return { records, store };
};

describe('useBulkChoices', () => {
  it('answers without a prompt when nothing qualifies', async () => {
    const { store } = createHarnessStore();
    const harness = await mountHook(store);
    const options = await harness.resolveChoices(plainItems);

    assert.deepEqual(options, { playlists: 'skip', repeats: 'keep' });
    assert.equal(harness.getRequest(), null);
  });

  it('asks both questions together and applies the confirmed answers', async () => {
    const { store } = createHarnessStore();
    const harness = await mountHook(store);
    let settled: PlaybackExpansionOptions | null | undefined;
    const request = harness.resolveChoices(items).then((options) => {
      settled = options;
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const props = harness.getRequest();

    assert.deepEqual(props?.dueQuestions, ['playlists', 'repeats']);
    assert.equal(props?.playlistLinkCount, 1);
    assert.equal(props?.repeatCount, 1);

    await act(async () => {
      harness.confirm({
        answers: { playlists: 'include', repeats: 'remove' },
        remember: false,
      });
      await request;
    });

    assert.deepEqual(settled, { playlists: 'include', repeats: 'remove' });
    assert.equal(harness.getRequest(), null);
    assert.equal(store.getSnapshot().repeatedItems, 'ask');
  });

  it('stores the answers as defaults when remembered, and skips the prompt next time', async () => {
    const { records, store } = createHarnessStore();
    const harness = await mountHook(store);
    const request = harness.resolveChoices(items);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      harness.confirm({
        answers: { playlists: 'include', repeats: 'remove' },
        remember: true,
      });
      await request;
    });

    await store.update({});
    assert.match(
      [...records.values()].join(),
      /"playlistsInFolders":"include".*"repeatedItems":"remove"/,
    );

    const next = await harness.resolveChoices(items);

    assert.deepEqual(next, { playlists: 'include', repeats: 'remove' });
    assert.equal(harness.getRequest(), null);
  });

  it('resolves null on cancel so the action applies nothing', async () => {
    const { store } = createHarnessStore();
    const harness = await mountHook(store);
    const request = harness.resolveChoices(items);

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(async () => {
      harness.cancel();
      await request;
    });

    assert.equal(await request, null);
    assert.equal(harness.getRequest(), null);
  });
});
