import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildDeleteCompositeDialog,
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

describe('resolveCompositeRowMenu', () => {
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
