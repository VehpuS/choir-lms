import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { resolveSavedTrackRowActions } from '../../playback/utils/saved-track-row-actions';
import {
  TRACK_ACTION_ORDER,
  sortActionsByLabelOrder,
} from './files-row-actions-contract';

describe('Tracks-view saved-track menu ordering', () => {
  it('orders rehearsal actions to match the Files-view overflow menu contract', () => {
    const actions = sortActionsByLabelOrder(
      resolveSavedTrackRowActions({
        canMutateLibrary: true,
        canMutateLoops: true,
        canMutatePlaylists: true,
        canQueueAsNext: true,
        hasAvailableSource: true,
        hasSavedLoops: true,
        isLoopBuilderPreparing: false,
        isLoopMutating: false,
        isPendingLoopSource: false,
        isPendingRemoval: false,
        isPlaybackSourceActive: false,
        isPlaylistMutating: false,
        isSavedLibraryMutating: false,
        onOpenLoopBuilder: () => undefined,
        onOpenPlaylistSelector: () => undefined,
        onOpenTagEditor: () => undefined,
        onQueueNext: () => undefined,
        onQueueUpNext: () => undefined,
        onRemove: () => undefined,
        onTogglePlayback: () => undefined,
        onViewTrackLoops: () => undefined,
        playbackAction: { disabled: false, label: 'Play' },
        sourceName: 'Warmup Take 3',
      }).filter((action) => action.placement === 'menu'),
      TRACK_ACTION_ORDER,
    );

    assert.deepEqual(
      actions.map((action) => action.label),
      [
        'Play next',
        'Add to queue',
        'Make loop',
        'View track loops',
        'Add to playlist',
        'Edit tags',
        'Remove',
      ],
    );
  });

  it('keeps the loop entry point ahead of playlist actions when the track has no saved loops', () => {
    const actions = sortActionsByLabelOrder(
      resolveSavedTrackRowActions({
        canMutateLibrary: true,
        canMutateLoops: true,
        canMutatePlaylists: true,
        canQueueAsNext: false,
        hasAvailableSource: true,
        hasSavedLoops: false,
        isLoopBuilderPreparing: false,
        isLoopMutating: false,
        isPendingLoopSource: false,
        isPendingRemoval: false,
        isPlaybackSourceActive: false,
        isPlaylistMutating: false,
        isSavedLibraryMutating: false,
        onOpenLoopBuilder: () => undefined,
        onOpenPlaylistSelector: () => undefined,
        onOpenTagEditor: () => undefined,
        onQueueNext: () => undefined,
        onQueueUpNext: () => undefined,
        onRemove: () => undefined,
        onTogglePlayback: () => undefined,
        onViewTrackLoops: () => undefined,
        playbackAction: { disabled: false, label: 'Play' },
        sourceName: 'Warmup Take 3',
      }).filter((action) => action.placement === 'menu'),
      TRACK_ACTION_ORDER,
    );

    assert.deepEqual(
      actions.map((action) => action.label),
      ['Make loop', 'Add to playlist', 'Edit tags', 'Remove'],
    );
  });
});
