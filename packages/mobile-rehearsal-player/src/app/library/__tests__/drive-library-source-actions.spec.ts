import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAYABLE_SOURCE } from '../../test-utils/library-test-fixtures.js';
import { resolveDriveLibrarySourceActionPlacement } from '../utils/drive-library-source-actions.js';
import { resolveDriveSourceActions } from '../utils/drive-search-preview-actions.js';

describe('drive library source actions', () => {
  it('uses explicit placement metadata directly', () => {
    assert.equal(
      resolveDriveLibrarySourceActionPlacement({
        label: 'Remove',
        onPress: () => undefined,
        placement: 'inline',
        tone: 'destructive',
      }),
      'inline',
    );

    assert.equal(
      resolveDriveLibrarySourceActionPlacement({
        label: 'Save',
        onPress: () => undefined,
        placement: 'menu',
      }),
      'menu',
    );
  });

  it('assigns explicit placement for Drive preview and save actions', () => {
    const unsavedActions = resolveDriveSourceActions({
      activePlayableItem: null,
      canMutateLibrary: true,
      isLibraryLoading: false,
      isLibraryMutating: false,
      isPreparingPlayback: false,
      isSaved: false,
      isSavePending: false,
      onPreviewPlayback: () => undefined,
      onRemoveSource: () => undefined,
      onSaveSource: () => undefined,
      playbackState: undefined,
      source: PLAYABLE_SOURCE,
    });
    const savedActions = resolveDriveSourceActions({
      activePlayableItem: null,
      canMutateLibrary: true,
      isLibraryLoading: false,
      isLibraryMutating: false,
      isPreparingPlayback: false,
      isSaved: true,
      isSavePending: false,
      onPreviewPlayback: () => undefined,
      onRemoveSource: () => undefined,
      onSaveSource: () => undefined,
      playbackState: undefined,
      source: PLAYABLE_SOURCE,
    });

    assert.deepEqual(
      unsavedActions.map((action) => ({
        label: action.label,
        placement: action.placement,
      })),
      [
        {
          label: 'Play',
          placement: 'inline',
        },
        {
          label: 'Save',
          placement: 'inline',
        },
      ],
    );
    assert.deepEqual(
      savedActions.map((action) => ({
        label: action.label,
        placement: action.placement,
      })),
      [
        {
          label: 'Play',
          placement: 'inline',
        },
        {
          label: 'Remove',
          placement: 'menu',
        },
      ],
    );
  });
});
