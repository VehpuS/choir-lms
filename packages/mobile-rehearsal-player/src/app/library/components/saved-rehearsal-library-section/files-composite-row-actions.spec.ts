import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createCompositePlayableItem,
  type CompositeTrack,
} from '@org/audio-library-models';

import type { LibraryFilesRow } from '../../saved-rehearsal-library/library-files-model';
import { resolveFilesRowMenuActions } from './files-row-actions';
import { createBaseOptions } from './files-row-actions-test-helpers';

const COMPOSITE: CompositeTrack = {
  createdAt: '2026-11-09T10:00:00.000Z',
  defaultMix: { levels: {} },
  id: 'composite-1',
  name: 'Ubi caritas',
  presets: [],
  stems: [
    { id: 's1', mine: false, name: 'Soprano', offsetMs: 0, trackId: 't1' },
    { id: 's2', mine: true, name: 'Bass', offsetMs: 0, trackId: 't2' },
  ],
};

const buildRow = (isPlayable: boolean): LibraryFilesRow => ({
  composite: COMPOSITE,
  fileLink: {
    entityId: COMPOSITE.id,
    entityKind: 'composite',
    id: 'file-link:composite:composite-1',
    parentFolderId: 'folder:library-root',
  },
  kind: 'composite',
  label: COMPOSITE.name,
  playableItem: isPlayable ? createCompositePlayableItem(COMPOSITE) : null,
  supportingLabel: 'Composite · 2 stems',
});

describe('resolveFilesRowMenuActions for a composite file', () => {
  it('offers queue, playlist, move, rename and delete, in that order', () => {
    const { options } = createBaseOptions();
    const labels = resolveFilesRowMenuActions({
      ...options,
      row: buildRow(true),
    }).map((action) => action.label);

    assert.deepEqual(labels, [
      'Play next',
      'Add to queue',
      'Add to playlist',
      'Move to folder',
      'Rename',
      'Delete composite',
    ]);
  });

  it('routes each action to the Files handlers for this row', () => {
    const { calls, options } = createBaseOptions();
    const actions = resolveFilesRowMenuActions({
      ...options,
      row: buildRow(true),
    });
    const press = (label: string) =>
      actions.find((action) => action.label === label)?.onPress();

    press('Play next');
    press('Add to queue');
    press('Add to playlist');
    press('Move to folder');
    press('Rename');
    press('Delete composite');

    assert.deepEqual(calls.next, ['composite']);
    assert.deepEqual(calls.upNext, ['composite']);
    assert.deepEqual(calls.compositePlaylists, ['composite-1']);
    assert.deepEqual(calls.moves, ['composite']);
    assert.deepEqual(calls.renames, ['composite']);
    assert.deepEqual(calls.deletions, ['composite']);
  });

  it('leaves out the queue rows when the composite cannot play', () => {
    const { options } = createBaseOptions();
    const labels = resolveFilesRowMenuActions({
      ...options,
      row: buildRow(false),
    }).map((action) => action.label);

    assert.equal(labels.includes('Play next'), false);
    assert.equal(labels.includes('Move to folder'), true);
  });

  it('disables moving while the library is being changed', () => {
    const { options } = createBaseOptions();
    const move = resolveFilesRowMenuActions({
      ...options,
      isSavedLibraryMutating: true,
      row: buildRow(true),
    }).find((action) => action.label === 'Move to folder');

    assert.equal(move?.disabled, true);
  });
});
