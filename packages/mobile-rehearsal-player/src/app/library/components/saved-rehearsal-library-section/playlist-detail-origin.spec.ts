import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPlaylistDetailOrigin,
  getPlaylistDetailEmptyStateCopy,
} from './playlist-detail-origin.js';

describe('playlist detail origin', () => {
  it('keeps files folder origin when opening playlist detail from Files', () => {
    assert.deepEqual(
      buildPlaylistDetailOrigin({
        originFilesFolderId: 'files-folder-warmups',
        originFilesFolderName: 'Warmups',
        originView: 'files',
      }),
      {
        filesFolderId: 'files-folder-warmups',
        filesFolderName: 'Warmups',
        view: 'files',
      },
    );
  });

  it('keeps Files view origin even when no specific folder id was captured', () => {
    assert.deepEqual(
      buildPlaylistDetailOrigin({
        originView: 'files',
      }),
      {
        filesFolderId: null,
        filesFolderName: null,
        view: 'files',
      },
    );
  });

  it('drops files folder origin for non-files views', () => {
    assert.deepEqual(
      buildPlaylistDetailOrigin({
        originFilesFolderId: 'files-folder-warmups',
        originFilesFolderName: 'Warmups',
        originView: 'playlists',
      }),
      {
        filesFolderId: null,
        filesFolderName: null,
        view: 'playlists',
      },
    );
  });

  it('returns null when no playlist-detail open context was provided', () => {
    assert.equal(buildPlaylistDetailOrigin(undefined), null);
  });

  it('builds folder-aware empty-state copy for Files-origin playlist detail', () => {
    assert.deepEqual(
      getPlaylistDetailEmptyStateCopy({
        filesFolderId: 'files-folder-warmups',
        filesFolderName: 'Warmups',
        view: 'files',
      }),
      {
        actionLabel: 'Add items',
        message:
          'This playlist is empty. Add tracks or loops from Warmups to start the running order.',
      },
    );
  });

  it('falls back to Files-folder copy when no Files folder name was captured', () => {
    assert.deepEqual(
      getPlaylistDetailEmptyStateCopy({
        filesFolderId: 'files-root',
        filesFolderName: null,
        view: 'files',
      }),
      {
        actionLabel: 'Add items',
        message:
          'This playlist is empty. Add tracks or loops from this Files folder to start the running order.',
      },
    );
  });

  it('keeps generic empty-state copy outside Files origin', () => {
    assert.deepEqual(
      getPlaylistDetailEmptyStateCopy({
        filesFolderId: null,
        filesFolderName: null,
        view: 'playlists',
      }),
      {
        actionLabel: null,
        message:
          'This playlist is empty. Add tracks or loops to start the running order.',
      },
    );
  });
});
