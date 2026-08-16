import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attachRowActionSections } from '../../../components/options-menu-sheet/row-action-sections';
import { toOptionsMenuAction } from '../../../components/saved-rehearsal-library-section/files-row-actions-contract';
import { resolveSavedLoopRowActions } from '../../utils/saved-loop-row-actions';

const buildMenuActions = (
  options: Parameters<typeof resolveSavedLoopRowActions>[0],
) => {
  return attachRowActionSections(
    resolveSavedLoopRowActions(options)
      .filter((action) => action.placement === 'menu')
      .map((action, index) => {
        return toOptionsMenuAction({ action, id: `loop:${index}` });
      }),
  );
};

describe('Loops-view saved-loop menu ordering and tone', () => {
  it('orders rehearsal, organize, and destructive actions matching the Files-view section contract', () => {
    const actions = buildMenuActions({
      canEditLoop: true,
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: true,
      hasPlayableItem: true,
      isEditingLoop: false,
      isLoopMutating: false,
      isPendingRemoval: false,
      isPlaylistMutating: false,
      itemName: 'Chorus Loop',
      onEdit: () => undefined,
      onEditTags: () => undefined,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      playbackAction: { disabled: false, label: 'Play' },
    });

    assert.deepEqual(
      actions.map((action) => ({ section: action.section, label: action.label })),
      [
        { label: 'Play next', section: 'rehearsal' },
        { label: 'Add to queue', section: 'rehearsal' },
        { label: 'Add to playlist', section: 'rehearsal' },
        { label: 'Edit loop', section: 'rehearsal' },
        { label: 'Edit tags', section: 'organize' },
        { label: 'Remove', section: 'destructive' },
      ],
    );
  });

  it('downgrades the primary-tone Add to playlist action to secondary, matching Files/Tracks sheet styling', () => {
    const actions = buildMenuActions({
      canEditLoop: true,
      canMutateLoops: true,
      canMutatePlaylists: true,
      canQueueAsNext: false,
      hasPlayableItem: true,
      isEditingLoop: false,
      isLoopMutating: false,
      isPendingRemoval: false,
      isPlaylistMutating: false,
      itemName: 'Chorus Loop',
      onEdit: () => undefined,
      onEditTags: () => undefined,
      onOpenPlaylistSelector: () => undefined,
      onQueueNext: () => undefined,
      onQueueUpNext: () => undefined,
      onRemove: () => undefined,
      onTogglePlayback: () => undefined,
      playbackAction: { disabled: false, label: 'Play' },
    });

    const addToPlaylist = actions.find(
      (action) => action.label === 'Add to playlist',
    );
    const remove = actions.find((action) => action.label === 'Remove');

    assert.equal(addToPlaylist?.tone, 'secondary');
    assert.equal(remove?.tone, 'destructive');
  });
});
