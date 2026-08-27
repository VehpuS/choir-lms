import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type Playlist,
  type RehearsalLibraryFolderNode,
} from '@org/audio-library-models';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import {
  resolveTagEditorTagsAndTitle,
  useSavedRehearsalLibraryTagEditor,
  type TagEditorTarget,
} from './use-saved-rehearsal-library-tag-editor';

// Tells React this environment intentionally drives updates through
// act(...), since nothing else here (no Jest) sets this for us.
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-1',
  mimeType: 'audio/mpeg',
  name: 'Full Choir.mp3',
  tags: ['Alto', 'Warmup'],
});

const LOOP: NamedLoop = {
  createdAt: '2026-05-10T00:00:00.000Z',
  endMs: 24000,
  id: 'loop-1',
  name: 'Verse entrance',
  ownerId: 'user-1',
  sourceId: SOURCE.id,
  sourceName: SOURCE.name,
  startMs: 12000,
  tags: ['Warmup'],
  updatedAt: '2026-05-10T00:00:00.000Z',
};

const PLAYLIST: Playlist = {
  createdAt: '2026-05-10T00:00:00.000Z',
  id: 'playlist-1',
  items: [],
  name: 'Morning rehearsal',
  ownerId: 'user-1',
  tags: ['Rehearsal'],
  updatedAt: '2026-05-10T00:00:00.000Z',
};

const FOLDER: RehearsalLibraryFolderNode = {
  createdAt: '2026-05-10T10:00:00.000Z',
  id: 'folder-1',
  name: 'Warmups',
  parentFolderId: 'folder:library-root',
  tags: ['Alto'],
};

const NEW_TAGS = ['Alto', 'Section leader'];

describe('resolveTagEditorTagsAndTitle', () => {
  it('resolves tags and title for a track target', () => {
    const target: TagEditorTarget = { kind: 'source', source: SOURCE };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Alto', 'Warmup'],
      title: 'Track tags • Full Choir.mp3',
    });
  });

  it('resolves tags and title for a loop target', () => {
    const target: TagEditorTarget = { kind: 'loop', loop: LOOP };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Warmup'],
      title: 'Loop tags • Verse entrance',
    });
  });

  it('resolves tags and title for a playlist target', () => {
    const target: TagEditorTarget = { kind: 'playlist', playlist: PLAYLIST };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Rehearsal'],
      title: 'Playlist tags • Morning rehearsal',
    });
  });

  it('resolves tags and title for a folder target', () => {
    const target: TagEditorTarget = {
      kind: 'folder',
      folder: {
        id: 'folder-1',
        name: 'Warmups',
        parentFolderId: 'folder:library-root',
        createdAt: '2026-05-10T10:00:00.000Z',
        tags: ['Alto'],
      },
    };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target), {
      tags: ['Alto'],
      title: 'Folder tags • Warmups',
    });
  });

  it('resolves an empty tags list and title when no target is selected', () => {
    assert.deepEqual(resolveTagEditorTagsAndTitle({ kind: 'none' }), {
      tags: [],
      title: '',
    });
  });

  it('defaults tags to an empty array when the target entity has none', () => {
    const target: TagEditorTarget = {
      kind: 'folder',
      folder: {
        id: 'folder-1',
        name: 'Warmups',
        parentFolderId: 'folder:library-root',
        createdAt: '2026-05-10T10:00:00.000Z',
      },
    };

    assert.deepEqual(resolveTagEditorTagsAndTitle(target).tags, []);
  });
});

type TagEditorHookResult = ReturnType<typeof useSavedRehearsalLibraryTagEditor>;
type TagEditorHookOptions = Parameters<typeof useSavedRehearsalLibraryTagEditor>[0];

const renderTagEditorHook = (options: TagEditorHookOptions) => {
  const hookResultBox: { current: TagEditorHookResult | null } = {
    current: null,
  };

  const Harness = () => {
    hookResultBox.current = useSavedRehearsalLibraryTagEditor(options);
    return null;
  };

  let renderer!: ReactTestRenderer;

  act(() => {
    renderer = create(createElement(Harness));
  });

  return { hookResultBox, renderer };
};

const createSpy = <Args extends unknown[], Result>(
  implementation: (...args: Args) => Promise<Result>,
) => {
  const calls: Args[] = [];
  const spy = async (...args: Args) => {
    calls.push(args);
    return implementation(...args);
  };

  return { calls, spy };
};

describe('useSavedRehearsalLibraryTagEditor -> saveTagEdits', () => {
  it('saves a source target with the edited tags and closes the editor on success', async () => {
    const saveSource = createSpy(async () => true);
    const { hookResultBox, renderer } = renderTagEditorHook({
      saveFolderTags: async () => ({ didComplete: true }),
      saveLoop: async () => true,
      saveSource: saveSource.spy,
      savedPlaylists: [PLAYLIST],
      updatePlaylist: async () => null,
    });

    act(() => {
      hookResultBox.current?.openSourceTagEditor(SOURCE);
    });

    await act(async () => {
      await hookResultBox.current?.saveTagEdits(NEW_TAGS);
    });

    assert.deepEqual(saveSource.calls, [[{ ...SOURCE, tags: NEW_TAGS }]]);
    assert.equal(hookResultBox.current?.isTagEditorVisible, false);
    assert.equal(hookResultBox.current?.isTagEditorSaving, false);

    act(() => {
      renderer.unmount();
    });
  });

  it('saves a loop target with the edited tags and closes the editor on success', async () => {
    const saveLoop = createSpy(async () => true);
    const { hookResultBox, renderer } = renderTagEditorHook({
      saveFolderTags: async () => ({ didComplete: true }),
      saveLoop: saveLoop.spy,
      saveSource: async () => true,
      savedPlaylists: [PLAYLIST],
      updatePlaylist: async () => null,
    });

    act(() => {
      hookResultBox.current?.openLoopTagEditor(LOOP);
    });

    await act(async () => {
      await hookResultBox.current?.saveTagEdits(NEW_TAGS);
    });

    assert.deepEqual(saveLoop.calls, [[{ ...LOOP, tags: NEW_TAGS }]]);
    assert.equal(hookResultBox.current?.isTagEditorVisible, false);

    act(() => {
      renderer.unmount();
    });
  });

  it('saves a playlist target through updatePlaylist and closes the editor on success', async () => {
    const updatePlaylist = createSpy(async () => PLAYLIST);
    const { hookResultBox, renderer } = renderTagEditorHook({
      saveFolderTags: async () => ({ didComplete: true }),
      saveLoop: async () => true,
      saveSource: async () => true,
      savedPlaylists: [PLAYLIST],
      updatePlaylist: updatePlaylist.spy,
    });

    act(() => {
      hookResultBox.current?.openPlaylistTagEditor(PLAYLIST.id);
    });

    await act(async () => {
      await hookResultBox.current?.saveTagEdits(NEW_TAGS);
    });

    assert.deepEqual(updatePlaylist.calls, [
      [{ ...PLAYLIST, tags: NEW_TAGS }],
    ]);
    assert.equal(hookResultBox.current?.isTagEditorVisible, false);

    act(() => {
      renderer.unmount();
    });
  });

  it('saves a folder target through saveFolderTags and closes the editor on success', async () => {
    const saveFolderTags = createSpy(async () => ({ didComplete: true }));
    const { hookResultBox, renderer } = renderTagEditorHook({
      saveFolderTags: saveFolderTags.spy,
      saveLoop: async () => true,
      saveSource: async () => true,
      savedPlaylists: [PLAYLIST],
      updatePlaylist: async () => null,
    });

    act(() => {
      hookResultBox.current?.openFolderTagEditor(FOLDER);
    });

    await act(async () => {
      await hookResultBox.current?.saveTagEdits(NEW_TAGS);
    });

    assert.deepEqual(saveFolderTags.calls, [
      [{ folder: FOLDER, tags: NEW_TAGS }],
    ]);
    assert.equal(hookResultBox.current?.isTagEditorVisible, false);

    act(() => {
      renderer.unmount();
    });
  });

  it('keeps the editor open and visible with the same target when the save fails', async () => {
    const saveSource = createSpy(async () => false);
    const { hookResultBox, renderer } = renderTagEditorHook({
      saveFolderTags: async () => ({ didComplete: true }),
      saveLoop: async () => true,
      saveSource: saveSource.spy,
      savedPlaylists: [PLAYLIST],
      updatePlaylist: async () => null,
    });

    act(() => {
      hookResultBox.current?.openSourceTagEditor(SOURCE);
    });

    await act(async () => {
      await hookResultBox.current?.saveTagEdits(NEW_TAGS);
    });

    assert.equal(saveSource.calls.length, 1);
    assert.equal(hookResultBox.current?.isTagEditorVisible, true);
    assert.equal(hookResultBox.current?.isTagEditorSaving, false);
    // The editor still shows the pre-edit saved tags, not the failed draft,
    // since the source save never actually persisted the new tags.
    assert.deepEqual(hookResultBox.current?.tags, SOURCE.tags);

    act(() => {
      renderer.unmount();
    });
  });
});
