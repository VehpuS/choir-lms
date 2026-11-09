import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDeleteCompositeDialog,
  resolveCompositeContentActions,
  resolveCompositeRowMenu,
  resolveRenameModel,
} from './composite-row-actions';

const noop = () => undefined;
const handlers = {
  canAddToPlaylist: true,
  onAddToPlaylist: noop,
  onPlayNext: noop,
  onAddToQueue: noop,
  onRename: noop,
  onDelete: noop,
};
const labels = (options: { isPlayable: boolean; canQueueAsNext: boolean }) =>
  resolveCompositeRowMenu({ ...options, ...handlers }).map(
    (action) => action.label,
  );

describe('resolveCompositeContentActions', () => {
  it('reads Lyrics, or Edit lyrics once the composite has some, then Sheet music', () => {
    const read = (hasLyrics: boolean) =>
      resolveCompositeContentActions({ compositeId: 'c1', hasLyrics }).map(
        (action) => action.label,
      );

    assert.deepEqual(read(false), ['Lyrics', 'Sheet music']);
    assert.deepEqual(read(true), ['Edit lyrics', 'Sheet music']);
  });

  it('sits between the playlist row and the offline rows', () => {
    const result = resolveCompositeRowMenu({
      ...handlers,
      canQueueAsNext: false,
      contentActions: resolveCompositeContentActions({
        compositeId: 'c1',
        hasLyrics: false,
      }),
      isPlayable: true,
      offlineActions: [
        { id: 'o', label: 'Keep all stems offline', onPress: noop },
      ],
    }).map((action) => action.label);

    assert.deepEqual(result.slice(0, 4), [
      'Add to playlist',
      'Lyrics',
      'Sheet music',
      'Keep all stems offline',
    ]);
  });
});

describe('resolveCompositeRowMenu', () => {
  it('places the offline rows before rename', () => {
    const offline = [
      { id: 'o', label: 'Keep all stems offline', onPress: noop },
    ];
    const result = resolveCompositeRowMenu({
      ...handlers,
      isPlayable: true,
      canQueueAsNext: false,
      offlineActions: offline,
    }).map((action) => action.label);

    assert.deepEqual(result, [
      'Add to playlist',
      'Keep all stems offline',
      'Rename',
      'Delete composite',
    ]);
  });

  it('offers the queue actions, rename and delete for a playable composite while something plays', () => {
    assert.deepEqual(labels({ isPlayable: true, canQueueAsNext: true }), [
      'Play next',
      'Add to queue',
      'Add to playlist',
      'Rename',
      'Delete composite',
    ]);
  });

  it('leaves the queue actions out with nothing playing or when every stem is gone', () => {
    const rest = ['Add to playlist', 'Rename', 'Delete composite'];

    assert.deepEqual(labels({ isPlayable: true, canQueueAsNext: false }), rest);
    assert.deepEqual(labels({ isPlayable: false, canQueueAsNext: true }), rest);
  });

  it('marks delete as destructive', () => {
    const actions = resolveCompositeRowMenu({
      isPlayable: true,
      canQueueAsNext: false,
      ...handlers,
    });

    assert.equal(actions.at(-1)?.tone, 'destructive');
  });
});

describe('add to playlist', () => {
  const addAction = (options: {
    canAddToPlaylist: boolean;
    isPlayable: boolean;
  }) =>
    resolveCompositeRowMenu({
      canQueueAsNext: false,
      ...handlers,
      ...options,
    }).find((action) => action.id === 'add-to-playlist');

  it('is offered while playlists can change, even for a composite with no stem left', () => {
    assert.equal(
      addAction({ canAddToPlaylist: true, isPlayable: true })?.disabled,
      false,
    );
    assert.equal(
      addAction({ canAddToPlaylist: true, isPlayable: false })?.disabled,
      false,
    );
  });

  it('says playlists are unavailable, and is off, when they cannot change', () => {
    const action = addAction({ canAddToPlaylist: false, isPlayable: true });

    assert.equal(action?.label, 'Playlists unavailable');
    assert.equal(action?.disabled, true);
  });
});

describe('buildDeleteCompositeDialog', () => {
  it('names the composite and says its stems stay as tracks', () => {
    const dialog = buildDeleteCompositeDialog({ name: 'Ubi', stemCount: 4 });

    assert.match(dialog.message, /“Ubi”/);
    assert.match(dialog.message, /4 stems stay in your library as tracks/);
    assert.equal(dialog.confirmLabel, 'Delete composite');
  });
});

describe('resolveRenameModel', () => {
  it('trims the name and needs one that is new and not blank', () => {
    assert.deepEqual(resolveRenameModel('  Ubi 2 ', 'Ubi'), {
      name: 'Ubi 2',
      canSave: true,
    });
    assert.equal(resolveRenameModel('   ', 'Ubi').canSave, false);
    assert.equal(resolveRenameModel('Ubi ', 'Ubi').canSave, false);
  });

  it('refuses a name longer than the record allows', () => {
    assert.equal(resolveRenameModel('x'.repeat(81), 'Ubi').canSave, false);
  });
});
