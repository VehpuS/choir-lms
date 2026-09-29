import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLoopPlayableItem } from '@org/audio-library-models';

import { getPlaylistOptionsMenuActions } from '../../playlists/utils/saved-playlist-view-model';
import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import type { OptionsMenuAction } from '../options-menu-sheet/model';
import { resolveFilesRowMenuActions } from '../saved-rehearsal-library-section/files-row-actions';
import {
  createBaseOptions,
  LOOP,
  PLAYLIST,
  SOURCE,
  UNAVAILABLE_SOURCE,
} from '../saved-rehearsal-library-section/files-row-actions-test-helpers';
import { composeSavedItemMenu } from './model';
import {
  resolveSavedLoopMenu,
  resolveSavedTrackMenu,
  type SavedLoopMenuContext,
  type SavedTrackMenuContext,
} from './saved-item-menus';

// Files' own container actions (the only thing Files may add, task 2.12).
const FILES_VIEW_LABELS = new Set([
  'Create a copy',
  'Rename',
  'Move to folder',
  'Delete from folder',
]);

const noop = () => undefined;

const describeMenu = (actions: OptionsMenuAction[]) => {
  return actions.map((action) => ({
    disabled: action.disabled ?? false,
    label: action.label,
    section: action.section,
  }));
};

const withoutFilesViewActions = (actions: OptionsMenuAction[]) => {
  return actions.filter((action) => !FILES_VIEW_LABELS.has(action.label));
};

const trackContext = (
  overrides: Partial<SavedTrackMenuContext> = {},
): SavedTrackMenuContext => ({
  canMutateLibrary: true,
  canMutateLoops: true,
  canMutatePlaylists: true,
  canQueueAsNext: true,
  canReconnect: true,
  isLoopBuilderPreparing: false,
  isLoopMutating: false,
  isPendingLoopSource: false,
  isPendingRemoval: false,
  isPlaylistMutating: false,
  isSavedLibraryMutating: false,
  loopCount: 0,
  onAddToPlaylist: noop,
  onAddToQueue: noop,
  onEditTags: noop,
  onMakeLoop: noop,
  onOpenInGoogleDrive: noop,
  onPlayNext: noop,
  onReconnect: noop,
  onRemoveFromLibrary: noop,
  onShowInAdd: noop,
  onViewTrackLoops: noop,
  pendingSourceLocationAction: null,
  source: SOURCE,
  ...overrides,
});

const loopContext = (): SavedLoopMenuContext => ({
  canEditLoop: true,
  canMutateLoops: true,
  canMutatePlaylists: true,
  canQueueAsNext: true,
  hasPlayableItem: true,
  isEditingLoop: false,
  isLoopMutating: false,
  isPendingRemoval: false,
  isPlaylistMutating: false,
  loopName: LOOP.name,
  onAddToPlaylist: noop,
  onAddToQueue: noop,
  onEditLoop: noop,
  onEditTags: noop,
  onPlayNext: noop,
  onRemoveFromLibrary: noop,
});

const fileLink = (entityKind: 'loop' | 'playlist' | 'track', id: string) => ({
  entityId: id,
  entityKind,
  id: `file-link:${entityKind}:${id}`,
  parentFolderId: 'folder:library-root',
});

const filesTrackRow = (
  source = SOURCE,
  loopCount = 0,
): LibraryFilesRow => ({
  fileLink: fileLink('track', source.id),
  isPlayable: source.availability.status === 'available',
  kind: 'track',
  label: source.name,
  loopCount,
  source,
  supportingLabel: 'Track',
});

describe('shared saved-item menus', () => {
  it('gives Files the same track menu as the Tracks view plus only its link actions', () => {
    const { options } = createBaseOptions();

    for (const [source, loopCount] of [
      [SOURCE, 2],
      [UNAVAILABLE_SOURCE, 0],
    ] as const) {
      const filesMenu = resolveFilesRowMenuActions({
        ...options,
        row: filesTrackRow(source, loopCount),
      });
      const tracksViewMenu = resolveSavedTrackMenu(
        trackContext({ loopCount, source }),
        { idPrefix: 'track' },
      );

      assert.deepEqual(
        describeMenu(withoutFilesViewActions(filesMenu)),
        describeMenu(tracksViewMenu),
      );
    }
  });

  it('gives Files the same loop menu as the Loops view plus only its link actions', () => {
    const { options } = createBaseOptions();
    const filesMenu = resolveFilesRowMenuActions({
      ...options,
      row: {
        fileLink: fileLink('loop', LOOP.id),
        kind: 'loop',
        label: LOOP.name,
        loop: LOOP,
        playableItem: createLoopPlayableItem(LOOP, SOURCE),
        source: SOURCE,
        supportingLabel: '0:12–0:24',
      },
    });

    assert.deepEqual(
      describeMenu(withoutFilesViewActions(filesMenu)),
      describeMenu(resolveSavedLoopMenu(loopContext(), { idPrefix: 'loop' })),
    );
  });

  it('gives Files and the Playlists view the same playlist actions apart from each view’s own', () => {
    const { options } = createBaseOptions();
    const filesMenu = resolveFilesRowMenuActions({
      ...options,
      row: {
        fileLink: fileLink('playlist', PLAYLIST.id),
        kind: 'playlist',
        label: PLAYLIST.name,
        playlist: PLAYLIST,
        supportingLabel: 'Playlist',
      } as LibraryFilesRow,
    });
    const playlistsViewMenu = getPlaylistOptionsMenuActions({
      isMutating: false,
      onAddItems: noop,
      onEditTags: noop,
      onRemove: noop,
      onRename: noop,
    });

    assert.deepEqual(
      describeMenu(withoutFilesViewActions(filesMenu)),
      describeMenu(
        playlistsViewMenu.filter((action) => action.label !== 'Rename playlist'),
      ),
    );
  });

  it('orders the track menu by the spec with removal last', () => {
    const labels = resolveSavedTrackMenu(trackContext({ loopCount: 1 }), {
      idPrefix: 'track',
    }).map((action) => action.label);

    assert.deepEqual(labels, [
      'Play next',
      'Add to queue',
      'Make loop',
      'View track loops',
      'Add to playlist',
      'Show in Add',
      'Open in Google Drive',
      'Edit tags',
      'Remove from library',
    ]);
  });

  it('keeps a pending Drive lookup in the slot of the action that started it', () => {
    const labels = resolveSavedTrackMenu(
      trackContext({
        pendingSourceLocationAction: {
          kind: 'open-in-google-drive',
          sourceId: SOURCE.id,
        },
      }),
      { idPrefix: 'track' },
    ).map((action) => action.label);

    assert.deepEqual(labels.slice(4, 7), [
      'Show in Add',
      'Checking Drive…',
      'Edit tags',
    ]);
  });

  it('orders the loop menu by the spec and labels removal Remove from library', () => {
    assert.deepEqual(
      resolveSavedLoopMenu(loopContext(), { idPrefix: 'loop' }).map(
        (action) => action.label,
      ),
      [
        'Play next',
        'Add to queue',
        'Add to playlist',
        'Edit loop',
        'Edit tags',
        'Remove from library',
      ],
    );
  });
  it('never emits primary-toned actions, which the options sheet would hoist out of order', () => {
    const { options } = createBaseOptions();
    const menus = [
      resolveSavedTrackMenu(trackContext({ loopCount: 1 }), { idPrefix: 't' }),
      resolveSavedLoopMenu(loopContext(), { idPrefix: 'l' }),
      getPlaylistOptionsMenuActions({
        isMutating: false,
        onAddItems: noop,
        onEditTags: noop,
        onRemove: noop,
        onRename: noop,
      }),
      resolveFilesRowMenuActions({ ...options, row: filesTrackRow() }),
    ];

    for (const menu of menus) {
      assert.ok(menu.every((action) => action.tone !== 'primary'));
    }
  });
});

describe('composeSavedItemMenu', () => {
  const action = (
    label: string,
    tone?: OptionsMenuAction['tone'],
  ): OptionsMenuAction => ({ id: label, label, onPress: noop, tone });

  it('places view actions after item actions, destructive ones last before removal', () => {
    const labels = composeSavedItemMenu({
      itemActions: [action('Edit tags'), action('Add items')],
      kind: 'playlist',
      removeAction: action('Remove from library', 'destructive'),
      viewActions: [
        action('Delete from folder', 'destructive'),
        action('Rename'),
      ],
    }).map(({ label }) => label);

    assert.deepEqual(labels, [
      'Add items',
      'Edit tags',
      'Rename',
      'Delete from folder',
      'Remove from library',
    ]);
  });

  it('keeps pending labels in their action’s slot and unknown actions after known ones', () => {
    const labels = composeSavedItemMenu({
      itemActions: [
        action('Something new'),
        action('Updating playlist…'),
        action('Preparing loop…'),
        action('Play next'),
      ],
      kind: 'track',
    }).map(({ label }) => label);

    assert.deepEqual(labels, [
      'Play next',
      'Preparing loop…',
      'Updating playlist…',
      'Something new',
    ]);
  });
});
