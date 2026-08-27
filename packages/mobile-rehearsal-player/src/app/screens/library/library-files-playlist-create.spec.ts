import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Playlist } from '@org/audio-library-models';

import { createPlaylistWithFilesLocation } from './library-files-playlist-create';

const PLAYLIST: Playlist = {
  createdAt: '2026-07-19T00:00:00.000Z',
  id: 'playlist-1',
  items: [],
  name: 'Folder playlist',
  ownerId: 'user-1',
  updatedAt: '2026-07-19T00:00:00.000Z',
};

const createFilesController = (currentFolderId: string) => {
  const movedFolders: string[] = [];

  return {
    files: {
      explorer: {
        breadcrumbs: [],
        currentFolder: {
          createdAt: '2026-05-10T10:00:00.000Z',
          id: currentFolderId,
          name:
            currentFolderId === 'folder:library-root' ? 'Library' : 'Warmups',
          parentFolderId: null,
        },
        rows: [],
      },
      moveFileLink: async (options: {
        destinationFolderId: string;
        fileLink: {
          entityId: string;
          entityKind: 'playlist';
          id: string;
          parentFolderId: string;
        };
      }) => {
        assert.equal(options.fileLink.entityId, PLAYLIST.id);
        assert.equal(options.fileLink.entityKind, 'playlist');
        assert.equal(options.fileLink.id, `file-link:playlist:${PLAYLIST.id}`);
        assert.equal(options.fileLink.parentFolderId, 'folder:library-root');
        movedFolders.push(options.destinationFolderId);
        return {
          didComplete: true,
          issue: null,
        };
      },
      rootFolderId: 'folder:library-root',
    },
    movedFolders,
  };
};

describe('createPlaylistWithFilesLocation', () => {
  it('moves a newly created playlist default link to the current non-root Files folder', async () => {
    const { files, movedFolders } = createFilesController('folder-warmups');
    const createdPlaylistIds: string[] = [];

    const createdPlaylist = await createPlaylistWithFilesLocation({
      createPlaylist: async (playlist) => {
        createdPlaylistIds.push(playlist.id);
        return playlist;
      },
      files,
      playlist: PLAYLIST,
    });

    assert.equal(createdPlaylist, PLAYLIST);
    assert.deepEqual(createdPlaylistIds, [PLAYLIST.id]);
    assert.deepEqual(movedFolders, ['folder-warmups']);
  });

  it('leaves root-folder playlist creation on the default root file link path', async () => {
    const { files, movedFolders } = createFilesController(
      'folder:library-root',
    );

    const createdPlaylist = await createPlaylistWithFilesLocation({
      createPlaylist: async (playlist) => playlist,
      files,
      playlist: PLAYLIST,
    });

    assert.equal(createdPlaylist, PLAYLIST);
    assert.deepEqual(movedFolders, []);
  });
});
