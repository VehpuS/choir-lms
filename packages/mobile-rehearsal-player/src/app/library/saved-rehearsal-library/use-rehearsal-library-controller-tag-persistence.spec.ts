/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { DriveAuthorizationState } from '@org/google-drive';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { useSavedRehearsalLibraryTagEditor } from '../components/saved-rehearsal-library-section/use-saved-rehearsal-library-tag-editor.js';
import type { DriveLibrarySource } from '../drive/utils/drive-library-view-model.js';
import { useSavedRehearsalLibrary } from './use-saved-rehearsal-library.js';
import { resolveSavedRehearsalLibrarySources } from './view-model.js';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;

const ORIGINAL_ASYNC_STORAGE = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

const installMemoryAsyncStorage = () => {
  const store = new Map<string, string>();

  mutableAsyncStorage.getItem = async (key: string) => store.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key: string) => {
    store.delete(key);
  };
  mutableAsyncStorage.setItem = async (key: string, value: string) => {
    store.set(key, value);
  };
};

const restoreAsyncStorage = () => {
  mutableAsyncStorage.getItem = ORIGINAL_ASYNC_STORAGE.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL_ASYNC_STORAGE.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL_ASYNC_STORAGE.setItem;
};

const waitForMicrotaskFlush = async () => {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
};

const AUTHORIZED_STATE: DriveAuthorizationState = {
  scope: 'https://www.googleapis.com/auth/drive.readonly',
  status: 'authorized',
};

const RAW_SOURCE: DriveLibrarySource = {
  id: 'drive:warmup-track',
  provider: 'google-drive',
  driveFileId: 'warmup-track',
  name: 'Warmup.mp3',
  mimeType: 'audio/mpeg',
  extension: 'mp3',
  createdAt: '2026-05-10T10:00:00.000Z',
  availability: { status: 'available' },
};

// The live Drive search/browse row for the SAME file, present at the moment
// of tagging (this is what `use-rehearsal-library-controller.ts` feeds into
// `resolveSavedRehearsalLibrarySources` as `visibleSources`).
const VISIBLE_SOURCE: DriveLibrarySource = {
  ...RAW_SOURCE,
  durationMs: 91234,
};

type Harness = {
  library: ReturnType<typeof useSavedRehearsalLibrary>;
  mergedSources: DriveLibrarySource[];
  tagEditor: ReturnType<typeof useSavedRehearsalLibraryTagEditor>;
};

const requireMergedSource = (sources: DriveLibrarySource[], id: string) => {
  const source = sources.find((currentSource) => currentSource.id === id);

  assert.ok(source, `expected a merged source with id "${id}"`);

  return source;
};

const renderHarness = async () => {
  const box: { current: Harness | null } = { current: null };

  const HarnessComponent = () => {
    const library = useSavedRehearsalLibrary();
    const mergedSources = resolveSavedRehearsalLibrarySources({
      authState: AUTHORIZED_STATE,
      savedSources: library.savedSources,
      visibleSources: [VISIBLE_SOURCE],
    });
    const tagEditor = useSavedRehearsalLibraryTagEditor({
      saveFolderTags: async () => ({ didComplete: true }),
      saveLoop: async () => true,
      saveSource: library.saveSource,
      savedPlaylists: [],
      updatePlaylist: async () => null,
    });

    box.current = { library, mergedSources, tagEditor };
    return null;
  };

  let renderer!: ReactTestRenderer;

  await act(async () => {
    renderer = create(createElement(HarnessComponent));
  });

  await act(async () => {
    await waitForMicrotaskFlush();
  });

  return { box, renderer };
};

describe('tag-save write path (composed library + tag editor + view-model merge)', () => {
  beforeEach(() => {
    installMemoryAsyncStorage();
  });

  afterEach(() => {
    restoreAsyncStorage();
  });

  it('reflects newly saved tags in the merged savedLibrarySources list a row and the tag editor both read from', async () => {
    const { box, renderer } = await renderHarness();

    await act(async () => {
      await box.current?.library.saveSource(RAW_SOURCE);
    });

    const mergedBeforeTagging = requireMergedSource(
      box.current?.mergedSources ?? [],
      RAW_SOURCE.id,
    );

    act(() => {
      box.current?.tagEditor.openSourceTagEditor(mergedBeforeTagging);
    });

    await act(async () => {
      await box.current?.tagEditor.saveTagEdits(['Alto']);
    });

    const mergedAfterTagging = requireMergedSource(
      box.current?.mergedSources ?? [],
      RAW_SOURCE.id,
    );

    assert.deepEqual(mergedAfterTagging.tags, ['Alto']);

    act(() => {
      box.current?.tagEditor.openSourceTagEditor(mergedAfterTagging);
    });

    assert.deepEqual(box.current?.tagEditor.tags, ['Alto']);

    act(() => {
      renderer.unmount();
    });
  });
});
