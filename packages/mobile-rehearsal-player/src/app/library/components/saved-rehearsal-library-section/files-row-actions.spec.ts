import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLoopPlayableItem } from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import {
  getDeleteFromFolderConfirmationCopy,
  getTrackRemoveFromLibraryPlacementLabel,
  resolveFilesRowMenuActions,
} from './files-row-actions';
import {
  createBaseOptions,
  LOOP,
  PLAYLIST,
  SOURCE,
  UNAVAILABLE_SOURCE,
} from './files-row-actions-test-helpers';
import {
  formatTrackRemoveFromLibraryImpactMessage,
  getTrackRemoveFromLibraryAffectedSections,
} from './library-files-delete-copy';

describe('resolveFilesRowMenuActions', () => {
  it('keeps Files track queue actions in the first menu level before playlist and tag flows', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      fileLink: {
        entityId: SOURCE.id,
        entityKind: 'track',
        id: `file-link:track:${SOURCE.id}`,
        parentFolderId: 'folder:library-root',
      },
      isPlayable: true,
      kind: 'track',
      label: SOURCE.name,
      source: SOURCE,
      supportingLabel: 'Track • 4:05',
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    actions.find((action) => action.label === 'Create a copy')?.onPress();
    actions.find((action) => action.label === 'Rename')?.onPress();
    actions.find((action) => action.label === 'Move to folder')?.onPress();
    actions.find((action) => action.label === 'Delete from folder')?.onPress();
    actions.find((action) => action.label === 'Remove from library')?.onPress();

    assert.deepEqual(
      actions.map((action) => action.label),
      [
        'Play next',
        'Add to queue',
        'Make loop',
        'Add to playlist',
        'Create a copy',
        'Edit tags',
        'Rename',
        'Move to folder',
        'Delete from folder',
        'Remove from library',
      ],
    );
    assert.equal(actions.at(-2)?.tone, 'destructive');
    assert.equal(actions.at(-1)?.tone, 'destructive');
    assert.deepEqual(calls.copies, ['track']);
    assert.deepEqual(calls.renames, ['track']);
    assert.deepEqual(calls.moves, ['track']);
    assert.deepEqual(calls.deletions, ['track']);
    assert.deepEqual(calls.removals, [SOURCE.id]);
    assert.equal(
      actions.find((action) => action.label === 'Remove from library')
        ?.disabled,
      false,
    );
  });

  it('routes loop menu actions into the existing queue, playlist, and tag flows', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      fileLink: {
        entityId: LOOP.id,
        entityKind: 'loop',
        id: `file-link:loop:${LOOP.id}`,
        parentFolderId: 'folder:library-root',
      },
      kind: 'loop',
      label: LOOP.name,
      loop: LOOP,
      playableItem: createLoopPlayableItem(LOOP, SOURCE),
      source: SOURCE,
      supportingLabel: `${SOURCE.name} • 0:12 to 0:24`,
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    actions.find((action) => action.label === 'Add to playlist')?.onPress();
    actions.find((action) => action.label === 'Edit tags')?.onPress();

    assert.deepEqual(calls.loopPlaylists, [LOOP.id]);
    assert.deepEqual(calls.loopTags, [LOOP.id]);
    assert.deepEqual(
      actions.map((action) => action.label),
      [
        'Play next',
        'Add to queue',
        'Add to playlist',
        'Create a copy',
        'Edit tags',
        'Rename',
        'Move to folder',
        'Delete from folder',
      ],
    );
  });

  it('adds recovery actions for unavailable track links', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      fileLink: {
        entityId: UNAVAILABLE_SOURCE.id,
        entityKind: 'track',
        id: `file-link:track:${UNAVAILABLE_SOURCE.id}`,
        parentFolderId: 'folder:library-root',
      },
      isPlayable: false,
      kind: 'track',
      label: UNAVAILABLE_SOURCE.name,
      message: UNAVAILABLE_SOURCE.availability.message,
      source: UNAVAILABLE_SOURCE,
      supportingLabel: 'Track unavailable',
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    actions.find((action) => action.label === 'Reconnect')?.onPress();
    actions.find((action) => action.label === 'Remove from library')?.onPress();

    assert.deepEqual(calls.reconnects, [UNAVAILABLE_SOURCE.id]);
    assert.deepEqual(calls.removals, [UNAVAILABLE_SOURCE.id]);
    assert.equal(
      actions.find((action) => action.label === 'Remove from library')
        ?.disabled,
      false,
    );

    const disconnectedActions = resolveFilesRowMenuActions({
      ...options,
      canReconnectLibrarySource: false,
      row,
    });

    assert.equal(
      disconnectedActions.find((action) => action.label === 'Reconnect')
        ?.disabled,
      true,
    );
  });

  it('keeps playlist links on the shared add-items and playlist tag editor flows', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      fileLink: {
        entityId: PLAYLIST.id,
        entityKind: 'playlist',
        id: `file-link:playlist:${PLAYLIST.id}`,
        parentFolderId: 'folder:library-root',
      },
      kind: 'playlist',
      label: PLAYLIST.name,
      playlist: PLAYLIST,
      supportingLabel: '0 items',
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    actions.find((action) => action.label === 'Add items')?.onPress();
    actions.find((action) => action.label === 'Edit tags')?.onPress();

    assert.deepEqual(
      actions.map((action) => action.label),
      [
        'Add items',
        'Create a copy',
        'Edit tags',
        'Rename',
        'Move to folder',
        'Delete from folder',
      ],
    );
    assert.deepEqual(calls.playlistAdds, [PLAYLIST.id]);
    assert.deepEqual(calls.playlistTags, [PLAYLIST.id]);
  });

  it('keeps folder overflow aligned with standard Files management actions', () => {
    const { calls, options } = createBaseOptions();
    const row: LibraryFilesRow = {
      childCount: 1,
      folder: {
        id: 'folder-warmups',
        name: 'Warmups',
        parentFolderId: 'folder:library-root',
      },
      kind: 'folder',
      label: 'Warmups',
      supportingLabel: '1 item',
    };

    const actions = resolveFilesRowMenuActions({
      ...options,
      row,
    });

    assert.deepEqual(
      actions.map((action) => action.label),
      ['Edit tags', 'Rename', 'Move to folder', 'Delete from folder'],
    );
    assert.deepEqual(calls.folders, []);
  });

  it('builds pointer-aware confirmation copy for Delete from folder', () => {
    const keepEntityCopy = getDeleteFromFolderConfirmationCopy({
      isLastLink: false,
      itemName: SOURCE.name,
    });
    const deleteEntityCopy = getDeleteFromFolderConfirmationCopy({
      isLastLink: true,
      itemName: SOURCE.name,
    });

    assert.equal(keepEntityCopy.title, 'Delete from folder?');
    assert.match(keepEntityCopy.message, /Only this folder link/);
    assert.equal(keepEntityCopy.confirmLabel, 'Delete from folder');

    assert.equal(deleteEntityCopy.title, 'Delete last link from folder?');
    assert.match(deleteEntityCopy.message, /last link/);
    assert.equal(deleteEntityCopy.confirmLabel, 'Delete item from library');
  });

  it('documents explicit track-level Remove from library placement', () => {
    assert.match(
      getTrackRemoveFromLibraryPlacementLabel(),
      /final destructive action/,
    );
  });

  it('summarizes track-level Remove from library dependency impact', () => {
    const row: Extract<LibraryFilesRow, { kind: 'track' }> = {
      fileLink: {
        entityId: SOURCE.id,
        entityKind: 'track',
        id: `file-link:track:${SOURCE.id}`,
        parentFolderId: 'folder:library-root',
      },
      isPlayable: true,
      kind: 'track',
      label: SOURCE.name,
      source: SOURCE,
      supportingLabel: 'Track • 4:05',
    };
    const message = formatTrackRemoveFromLibraryImpactMessage(row, {
      fileLinkCount: 2,
      fileLinkNames: ['Original track link', 'Practice copy'],
      loopCount: 1,
      loopNames: ['Verse entrance'],
      playlistEntryCount: 3,
      playlistEntryTitles: [
        'Warmups: Full Choir.mp3',
        'Warmups: Verse entrance',
        'Sunday: Full Choir.mp3',
      ],
    });

    assert.match(message, /Review affected items/);
    assert.doesNotMatch(message, /Verse entrance/);
    assert.deepEqual(
      getTrackRemoveFromLibraryAffectedSections({
        fileLinkCount: 2,
        fileLinkNames: ['Original track link', 'Practice copy'],
        loopCount: 1,
        loopNames: ['Verse entrance'],
        playlistEntryCount: 3,
        playlistEntryTitles: [
          'Warmups: Full Choir.mp3',
          'Warmups: Verse entrance',
          'Sunday: Full Choir.mp3',
        ],
      }),
      [
        { items: ['Verse entrance'], title: 'Saved loops (1)' },
        {
          items: ['Original track link', 'Practice copy'],
          title: 'Folder links (2)',
        },
        {
          items: [
            'Warmups: Full Choir.mp3',
            'Warmups: Verse entrance',
            'Sunday: Full Choir.mp3',
          ],
          title: 'Playlist entries (3)',
        },
      ],
    );
  });
});
