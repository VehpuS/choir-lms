import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  consumeSavedPlaylistRenameRequest,
  queueSavedPlaylistRenameRequest,
} from '../utils/saved-playlist-detail-view-model.js';

describe('saved playlist detail rename request helpers', () => {
  it('queues and consumes rename requests for the matching playlist only', () => {
    queueSavedPlaylistRenameRequest('playlist-1');

    assert.equal(consumeSavedPlaylistRenameRequest('playlist-2'), false);
    assert.equal(consumeSavedPlaylistRenameRequest('playlist-1'), true);
    assert.equal(consumeSavedPlaylistRenameRequest('playlist-1'), false);
  });
});
