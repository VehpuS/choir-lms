/// <reference types="node" />

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SAVED_LOOP } from '../../../test-utils/library-test-fixtures.js';
import { resolveSavedLoopRowActions } from './saved-loop-row-actions.js';

describe('saved loop row actions', () => {
  it('keeps loop playback inline and routes secondary actions through overflow', () => {
    const actions = resolveSavedLoopRowActions({
      canEditLoop: true,
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: true,
      hasPlayableItem: true,
      isEditingLoop: false,
      itemName: SAVED_LOOP.name,
      isLoopActive: false,
      isLoopMutating: false,
      isPendingRemoval: false,
      isPlaylistMutating: false,
      onEdit: () => undefined,
      onEditTags: () => undefined,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      playbackAction: {
        disabled: false,
        label: 'Play',
      },
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
          accessibilityLabel: 'Play Entrance cue',
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
          label: 'Edit loop',
          placement: 'menu',
          tone: undefined,
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

  it('keeps Edit loop available while the loop itself is the active playback item', () => {
    const actions = resolveSavedLoopRowActions({
      canEditLoop: true,
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: false,
      hasPlayableItem: true,
      isEditingLoop: false,
      itemName: SAVED_LOOP.name,
      isLoopActive: true,
      isLoopMutating: false,
      isPendingRemoval: false,
      isPlaylistMutating: false,
      onEdit: () => undefined,
      onEditTags: () => undefined,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      playbackAction: {
        disabled: false,
        label: 'Pause',
      },
    });

    assert.equal(
      actions.find((action) => action.label === 'Edit loop')?.disabled,
      false,
    );
  });

  it('omits loop queue actions when playback queueing is unavailable', () => {
    const actions = resolveSavedLoopRowActions({
      canEditLoop: false,
      canMutateLoops: true,
      canMutatePlaylists: false,
      canQueueAsNext: false,
      hasPlayableItem: false,
      isEditingLoop: false,
      itemName: SAVED_LOOP.name,
      isLoopActive: true,
      isLoopMutating: true,
      isPendingRemoval: true,
      isPlaylistMutating: false,
      onEdit: () => undefined,
      onEditTags: () => undefined,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      playbackAction: {
        disabled: true,
        label: 'Unavailable',
      },
    });

    assert.deepEqual(
      actions.map((action) => ({
        accessibilityLabel: action.accessibilityLabel,
        disabled: action.disabled ?? false,
        iconName: action.iconName,
        label: action.label,
        placement: action.placement,
      })),
      [
        {
          accessibilityLabel: 'Unavailable Entrance cue',
          disabled: true,
          iconName: 'play',
          label: 'Unavailable',
          placement: 'inline',
        },
        {
          accessibilityLabel: undefined,
          disabled: true,
          iconName: undefined,
          label: 'Playlists unavailable',
          placement: 'menu',
        },
        {
          accessibilityLabel: undefined,
          disabled: true,
          iconName: undefined,
          label: 'Edit loop',
          placement: 'menu',
        },
        {
          accessibilityLabel: undefined,
          disabled: true,
          iconName: undefined,
          label: 'Edit tags',
          placement: 'menu',
        },
        {
          accessibilityLabel: undefined,
          disabled: true,
          iconName: undefined,
          label: 'Removing…',
          placement: 'menu',
        },
      ],
    );
  });
});
