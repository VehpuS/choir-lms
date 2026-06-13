/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { resolveDriveSourceActions } from './drive-search-preview-actions.js';

describe('drive search preview actions', () => {
  it('returns separate preview playback and save actions for unsaved Drive search rows', () => {
    const actions = resolveDriveSourceActions({
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

    assert.equal(actions.length, 2);
    assert.deepEqual(actions[0], {
      accessibilityLabel: 'Play Alto Line.mp3',
      disabled: false,
      iconName: 'play',
      label: 'Play',
      onPress: actions[0]?.onPress,
      placement: 'inline',
      tone: 'primary',
    });
    assert.deepEqual(actions[1], {
      disabled: false,
      label: 'Save',
      onPress: actions[1]?.onPress,
      placement: 'inline',
    });
  });

  it('maps playback and save state labels for active and saved Drive search rows', () => {
    const actions = resolveDriveSourceActions({
      activePlayableItem: {
        description: 'Full track',
        id: 'track:drive:alto-line',
        kind: 'track',
        playlistEntryId: undefined,
        playlistId: undefined,
        range: {
          endMs: 185000,
          startMs: 0,
        },
        source: PLAYABLE_SOURCE,
        sourceId: PLAYABLE_SOURCE.id,
        title: PLAYABLE_SOURCE.name,
      },
      canMutateLibrary: true,
      isLibraryLoading: false,
      isLibraryMutating: false,
      isPreparingPlayback: false,
      isSaved: true,
      isSavePending: true,
      onPreviewPlayback: () => undefined,
      onRemoveSource: () => undefined,
      onSaveSource: () => undefined,
      playbackState: 'playing',
      source: PLAYABLE_SOURCE,
    });

    assert.equal(actions[0]?.label, 'Pause');
    assert.equal(actions[0]?.iconName, 'pause');
    assert.equal(actions[1]?.label, 'Removing…');
  });
});
