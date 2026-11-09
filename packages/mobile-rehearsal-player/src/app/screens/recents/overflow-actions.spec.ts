import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getRecentsOverflowActionState } from './overflow-actions.js';

describe('getRecentsOverflowActionState', () => {
  it('enables queue and library actions when both capabilities are available', () => {
    const actions = getRecentsOverflowActionState({
      canQueueAsNext: true,
      isViewInLibraryAvailable: true,
    });

    assert.deepEqual(
      actions.map((action) => ({
        disabled: action.disabled,
        id: action.id,
      })),
      [
        { disabled: false, id: 'play-next' },
        { disabled: false, id: 'add-to-queue' },
        { disabled: false, id: 'view-in-library' },
      ],
    );
  });

  it('disables queue actions when there is no active queue session', () => {
    const actions = getRecentsOverflowActionState({
      canQueueAsNext: false,
      isViewInLibraryAvailable: true,
    });

    assert.equal(actions[0]?.disabled, true);
    assert.equal(actions[1]?.disabled, true);
    assert.equal(actions[2]?.disabled, false);
  });

  it('disables view in library when the recent item has no saved-library match', () => {
    const actions = getRecentsOverflowActionState({
      canQueueAsNext: true,
      isViewInLibraryAvailable: false,
    });

    assert.equal(actions[0]?.disabled, false);
    assert.equal(actions[1]?.disabled, false);
    assert.equal(actions[2]?.disabled, true);
  });

  it('offers Queue playlist and View in library for a playlist row', () => {
    const actions = getRecentsOverflowActionState({
      canQueueAsNext: true,
      isPlaylist: true,
      isViewInLibraryAvailable: true,
    });

    assert.deepEqual(
      actions.map((action) => ({ disabled: action.disabled, id: action.id })),
      [
        { disabled: false, id: 'queue-playlist' },
        { disabled: false, id: 'view-in-library' },
      ],
    );
  });

  it('disables Queue playlist while nothing is playing', () => {
    const actions = getRecentsOverflowActionState({
      canQueueAsNext: false,
      isPlaylist: true,
      isViewInLibraryAvailable: true,
    });

    assert.equal(actions[0]?.id, 'queue-playlist');
    assert.equal(actions[0]?.disabled, true);
  });
});
