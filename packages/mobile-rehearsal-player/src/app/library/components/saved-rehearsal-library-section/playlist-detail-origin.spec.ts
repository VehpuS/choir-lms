import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPlaylistDetailOrigin } from './playlist-detail-origin.js';

describe('playlist detail origin', () => {
  it('keeps files folder origin when opening playlist detail from Files', () => {
    assert.deepEqual(
      buildPlaylistDetailOrigin({
        originFilesFolderId: 'files-folder-warmups',
        originView: 'files',
      }),
      {
        filesFolderId: 'files-folder-warmups',
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
        view: 'files',
      },
    );
  });

  it('drops files folder origin for non-files views', () => {
    assert.deepEqual(
      buildPlaylistDetailOrigin({
        originFilesFolderId: 'files-folder-warmups',
        originView: 'playlists',
      }),
      {
        filesFolderId: null,
        view: 'playlists',
      },
    );
  });

  it('returns null when no playlist-detail open context was provided', () => {
    assert.equal(buildPlaylistDetailOrigin(undefined), null);
  });
});
