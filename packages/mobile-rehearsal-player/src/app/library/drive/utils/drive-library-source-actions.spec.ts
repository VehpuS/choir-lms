import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PLAYABLE_SOURCE } from '../../../test-utils/library-test-fixtures.js';
import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions.js';
import {
  resolveDriveLibrarySourceActionPlacement,
  resolveDriveLibrarySourceMenuTone,
} from './drive-library-source-actions.js';
import { resolveDriveSourceActions } from './drive-search-preview-actions.js';

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
        accessibilityLabel: action.accessibilityLabel,
        iconName: action.iconName,
        label: action.label,
        placement: action.placement,
      })),
      [
        {
          accessibilityLabel: 'Play Alto Line.mp3',
          iconName: 'play',
          label: 'Play',
          placement: 'inline',
        },
        {
          accessibilityLabel: undefined,
          iconName: undefined,
          label: 'Save',
          placement: 'inline',
        },
      ],
    );
    assert.deepEqual(
      savedActions.map((action) => ({
        accessibilityLabel: action.accessibilityLabel,
        iconName: action.iconName,
        label: action.label,
        placement: action.placement,
      })),
      [
        {
          accessibilityLabel: 'Play Alto Line.mp3',
          iconName: 'play',
          label: 'Play',
          placement: 'inline',
        },
        {
          accessibilityLabel: undefined,
          iconName: undefined,
          label: 'Remove',
          placement: 'menu',
        },
      ],
    );
  });

  it('keeps saved track rows to one inline playback icon and overflow-only secondary actions', () => {
    const actions = resolveSavedTrackRowActions({
      canMutateLibrary: true,
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: true,
      hasSavedLoops: true,
      hasAvailableSource: true,
      isLoopBuilderPreparing: false,
      isLoopMutating: false,
      isPendingLoopSource: false,
      isPendingRemoval: false,
      isPlaylistMutating: false,
      isSavedLibraryMutating: false,
      onOpenLoopBuilder: () => undefined,
      onOpenTagEditor: () => undefined,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      onViewTrackLoops: () => undefined,
      playbackAction: {
        disabled: false,
        label: 'Play',
      },
      sourceName: PLAYABLE_SOURCE.name,
    });

    assert.deepEqual(
      actions.map((action) => ({
        accessibilityLabel: action.accessibilityLabel,
        disabled: action.disabled ?? false,
        iconName: action.iconName,
        label: action.label,
        placement: action.placement,
        tone: action.tone,
      })),
      [
        {
          accessibilityLabel: 'Play Alto Line.mp3',
          disabled: false,
          iconName: 'play',
          label: 'Play',
          placement: 'inline',
          tone: 'primary',
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Make loop',
          placement: 'menu',
          tone: undefined,
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'View track loops',
          placement: 'menu',
          tone: undefined,
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Play next',
          placement: 'menu',
          tone: undefined,
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Add to queue',
          placement: 'menu',
          tone: undefined,
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Add to playlist',
          placement: 'menu',
          tone: 'primary',
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Edit tags',
          placement: 'menu',
          tone: undefined,
        },
        {
          accessibilityLabel: undefined,
          disabled: false,
          iconName: undefined,
          label: 'Remove',
          placement: 'menu',
          tone: 'destructive',
        },
      ],
    );
  });

  it('omits View track loops when the saved track has no loops yet', () => {
    const actions = resolveSavedTrackRowActions({
      canMutateLibrary: true,
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: true,
      hasSavedLoops: false,
      hasAvailableSource: true,
      isLoopBuilderPreparing: false,
      isLoopMutating: false,
      isPendingLoopSource: false,
      isPendingRemoval: false,
      isPlaylistMutating: false,
      isSavedLibraryMutating: false,
      onOpenLoopBuilder: () => undefined,
      onOpenTagEditor: () => undefined,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      onViewTrackLoops: () => undefined,
      playbackAction: {
        disabled: false,
        label: 'Play',
      },
      sourceName: PLAYABLE_SOURCE.name,
    });

    assert.equal(
      actions.some((action) => action.label === 'View track loops'),
      false,
    );
  });

  it('downgrades primary-tone menu items to secondary so overflow menus never highlight one action', () => {
    assert.equal(resolveDriveLibrarySourceMenuTone('primary'), 'secondary');
    assert.equal(resolveDriveLibrarySourceMenuTone(undefined), 'secondary');
    assert.equal(resolveDriveLibrarySourceMenuTone('neutral'), 'secondary');
    assert.equal(
      resolveDriveLibrarySourceMenuTone('destructive'),
      'destructive',
    );
  });
});
