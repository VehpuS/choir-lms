import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  consumeSavedPlaylistRenameRequest,
  getSavedPlaylistDetailItemRemovalCopy,
  getSavedPlaylistDetailRemoveActionPresentation,
  queueSavedPlaylistRenameRequest,
} from '../utils/saved-playlist-detail-view-model.js';

describe('saved playlist detail rename request helpers', () => {
  it('queues and consumes rename requests for the matching playlist only', () => {
    queueSavedPlaylistRenameRequest('playlist-1');

    assert.equal(consumeSavedPlaylistRenameRequest('playlist-2'), false);
    assert.equal(consumeSavedPlaylistRenameRequest('playlist-1'), true);
    assert.equal(consumeSavedPlaylistRenameRequest('playlist-1'), false);
  });

  it('uses icon-only remove affordance in default detail mode', () => {
    assert.deepEqual(getSavedPlaylistDetailRemoveActionPresentation(false), {
      isIconOnly: true,
      tone: 'neutral',
    });
  });

  it('keeps destructive text remove affordance in detail edit mode', () => {
    assert.deepEqual(getSavedPlaylistDetailRemoveActionPresentation(true), {
      isIconOnly: false,
      tone: 'destructive',
    });
  });

  it('builds confirmation copy for playlist item removal alerts', () => {
    assert.deepEqual(
      getSavedPlaylistDetailItemRemovalCopy({
        entryTitle: 'Alto Line.mp3',
        playlistTitle: 'Warmups',
      }),
      {
        confirmLabel: 'Remove item',
        message:
          '"Alto Line.mp3" will be removed from Warmups. You can undo after removal.',
        title: 'Remove playlist item?',
      },
    );
  });
});
