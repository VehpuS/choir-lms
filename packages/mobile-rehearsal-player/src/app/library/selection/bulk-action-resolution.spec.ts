import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  resolveBulkActions,
  type BulkActionId,
  type BulkSurface,
  type ResolvedBulkAction,
} from './bulk-action-resolution.js';
import type { BulkSelectionItem } from './playback-expansion.js';

const track: BulkSelectionItem = { entityId: 't', key: 'k-t', kind: 'track' };
const folder: BulkSelectionItem = {
  folderId: 'f',
  key: 'k-f',
  kind: 'folder',
};
const playlist: BulkSelectionItem = {
  key: 'k-p',
  kind: 'playlist',
  playlistId: 'p',
};

const resolve = (
  surface: BulkSurface,
  items: BulkSelectionItem[],
  effectivePlayableCount = items.length,
) => resolveBulkActions({ effectivePlayableCount, items, surface });
const idsOf = (actions: ResolvedBulkAction[]): BulkActionId[] =>
  actions.map(({ id }) => id);
const find = (actions: ResolvedBulkAction[], id: BulkActionId) => {
  const action = actions.find((candidate) => candidate.id === id);

  assert.ok(action, `${id} should be offered`);

  return action;
};

describe('resolveBulkActions offers per surface', () => {
  const PLAYBACK_FIRST: BulkActionId[] = [
    'play-next',
    'add-to-queue',
    'add-to-playlist',
  ];

  it('puts the three always-visible actions first on every surface', () => {
    const surfaces: BulkSurface[] = [
      'files',
      'tracks',
      'loops',
      'playlists',
      'playlist-detail',
      'tag-detail',
      'library-search',
    ];

    for (const surface of surfaces) {
      assert.deepEqual(
        idsOf(resolve(surface, [track])).slice(0, 3),
        PLAYBACK_FIRST,
        surface,
      );
    }
  });

  it('offers Move and Delete from folder on Files only', () => {
    assert.deepEqual(idsOf(resolve('files', [track])), [
      'play-next',
      'add-to-queue',
      'add-to-playlist',
      'save-as-playlist',
      'edit-tags',
      'copy-to-folder',
      'move-to-folder',
      'delete-from-folder',
      'remove-from-library',
    ]);

    for (const surface of ['tracks', 'loops', 'playlists'] as const) {
      const offered = idsOf(resolve(surface, [track]));

      assert.equal(offered.includes('move-to-folder'), false, surface);
      assert.equal(offered.includes('delete-from-folder'), false, surface);
    }
  });

  it('offers Remove from playlist, and no entity actions, in playlist detail', () => {
    assert.deepEqual(idsOf(resolve('playlist-detail', [track])), [
      'play-next',
      'add-to-queue',
      'add-to-playlist',
      'save-as-playlist',
      'remove-from-playlist',
    ]);
  });

  it('gives tag detail and Library search the same entity actions as the views', () => {
    const viewActions = idsOf(resolve('tracks', [track]));

    assert.deepEqual(idsOf(resolve('tag-detail', [track])), viewActions);
    assert.deepEqual(idsOf(resolve('library-search', [track])), viewActions);
  });

  it('marks only removals as destructive', () => {
    const destructive = resolve('files', [track])
      .filter(({ tone }) => tone === 'destructive')
      .map(({ id }) => id);

    assert.deepEqual(destructive, [
      'delete-from-folder',
      'remove-from-library',
    ]);
    assert.equal(
      find(resolve('playlist-detail', [track]), 'remove-from-playlist').tone,
      'destructive',
    );
  });
});

describe('resolveBulkActions disabled reasons', () => {
  it('disables everything with a reason when nothing is selected', () => {
    for (const action of resolve('files', [])) {
      assert.equal(action.isDisabled, true, action.id);
      assert.equal(action.disabledReason, 'Nothing is selected.', action.id);
    }
  });

  it('disables playback and playlist actions when the selection expands to nothing', () => {
    const actions = resolve('files', [folder], 0);

    for (const id of [
      'play-next',
      'add-to-queue',
      'add-to-playlist',
      'save-as-playlist',
    ] as const) {
      assert.equal(find(actions, id).isDisabled, true, id);
      assert.match(
        find(actions, id).disabledReason ?? '',
        /no tracks or loops/,
      );
    }

    // Tags and Delete from folder act on the folder node itself.
    assert.equal(find(actions, 'edit-tags').isDisabled, false);
    assert.equal(find(actions, 'delete-from-folder').isDisabled, false);
  });

  it('keeps playback actions on for a folder that expands to audio', () => {
    assert.equal(
      find(resolve('files', [folder], 12), 'play-next').isDisabled,
      false,
    );
  });

  it('excludes folders from Copy and Remove from library with a count', () => {
    const actions = resolve('files', [folder, folder, track]);

    for (const id of ['copy-to-folder', 'remove-from-library'] as const) {
      assert.equal(find(actions, id).isDisabled, false, id);
      assert.equal(find(actions, id).excludedFolderCount, 2, id);
    }

    assert.equal(find(actions, 'move-to-folder').excludedFolderCount, 0);
  });

  it('disables Copy and Remove from library when only folders are selected, and says what to use', () => {
    const actions = resolve('files', [folder], 3);

    assert.equal(
      find(actions, 'copy-to-folder').disabledReason,
      'Folders cannot be copied.',
    );
    assert.equal(
      find(actions, 'remove-from-library').disabledReason,
      'Folders can only be removed with Delete from folder.',
    );
    assert.equal(find(actions, 'move-to-folder').isDisabled, false);
  });

  it('uses the generic folder reason where Delete from folder does not exist', () => {
    assert.equal(
      find(resolve('library-search', [folder], 3), 'remove-from-library')
        .disabledReason,
      'Folders cannot be removed from the library.',
    );
  });

  it('treats a selected playlist as a normal node for copy and removal', () => {
    const actions = resolve('playlists', [playlist], 4);

    assert.equal(find(actions, 'copy-to-folder').isDisabled, false);
    assert.equal(find(actions, 'remove-from-library').isDisabled, false);
  });
});
