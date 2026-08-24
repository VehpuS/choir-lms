import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type NamedLoop,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { buildLibraryFilesExplorerState } from './library-files-model';
import { PLAYLIST, SAVED_LOOP } from './library-files-model-test-fixtures';

const ROOT_FOLDER = {
  id: 'folder:library-root',
  name: 'Library',
  parentFolderId: null,
  createdAt: '2026-05-10T10:00:00.000Z',
};

const TAGGED_SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-tagged',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-05T09:00:00.000Z',
  name: 'Alto Warmup.mp3',
  tags: ['Alto'],
});

const UNTAGGED_SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-untagged',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-05T09:00:00.000Z',
  name: 'Bass Warmup.mp3',
});

const TAGGED_LOOP: NamedLoop = {
  ...SAVED_LOOP,
  id: 'loop-tagged',
  name: 'Alto entrance',
  sourceId: TAGGED_SOURCE.id,
  sourceName: TAGGED_SOURCE.name,
  tags: ['Alto'],
};

const FOLDER_TRACKS = {
  id: 'folder-tracks',
  name: 'Tracks Folder',
  parentFolderId: ROOT_FOLDER.id,
  createdAt: '2026-05-10T10:00:00.000Z',
};

const FOLDER_NO_TRACKS = {
  id: 'folder-no-tracks',
  name: 'No Tracks Folder',
  parentFolderId: ROOT_FOLDER.id,
  createdAt: '2026-05-10T10:00:00.000Z',
};

describe('library-files model browse filters', () => {
  it('Show: Tracks hides non-track leaf rows and folders with no track anywhere inside', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: FOLDER_TRACKS.id,
        },
        {
          entityId: PLAYLIST.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: FOLDER_NO_TRACKS.id,
        },
        {
          entityId: SAVED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${SAVED_LOOP.id}`,
          parentFolderId: FOLDER_NO_TRACKS.id,
        },
        {
          entityId: PLAYLIST.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${PLAYLIST.id}:root`,
          parentFolderId: ROOT_FOLDER.id,
        },
      ],
      folders: [ROOT_FOLDER, FOLDER_TRACKS, FOLDER_NO_TRACKS],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: ROOT_FOLDER.id,
      savedLoops: [SAVED_LOOP],
      savedPlaylists: [PLAYLIST],
      savedSources: [UNTAGGED_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'tracks',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'all',
        selectedTagFilters: [],
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      ['Tracks Folder'],
    );
  });

  it('a Tags filter hides non-matching leaf rows and folders with neither a matching tag nor a matching descendant', () => {
    const folderAlto = {
      id: 'folder-alto',
      name: 'Alto Folder',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const folderBass = {
      id: 'folder-bass',
      name: 'Bass Folder',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: TAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${TAGGED_SOURCE.id}`,
          parentFolderId: folderAlto.id,
        },
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: folderBass.id,
        },
      ],
      folders: [ROOT_FOLDER, folderAlto, folderBass],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: ROOT_FOLDER.id,
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [TAGGED_SOURCE, UNTAGGED_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'all',
        selectedTagFilters: ['Alto'],
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      ['Alto Folder'],
    );
  });

  it('a folder matching only via its own tags stays visible', () => {
    const folderOwnTag = {
      id: 'folder-own-tag',
      name: 'Own Tag Folder',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
      tags: ['Alto'],
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: folderOwnTag.id,
        },
      ],
      folders: [ROOT_FOLDER, folderOwnTag],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: ROOT_FOLDER.id,
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [UNTAGGED_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'all',
        selectedTagFilters: ['Alto'],
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      ['Own Tag Folder'],
    );
  });

  it('combining Show and Tags filters narrows to items matching both', () => {
    const folderTaggedTrack = {
      id: 'folder-tagged-track',
      name: 'Tagged Track Folder',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const folderTaggedLoop = {
      id: 'folder-tagged-loop',
      name: 'Tagged Loop Folder',
      parentFolderId: ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: TAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${TAGGED_SOURCE.id}`,
          parentFolderId: folderTaggedTrack.id,
        },
        {
          entityId: TAGGED_LOOP.id,
          entityKind: 'loop',
          id: `file-link:loop:${TAGGED_LOOP.id}`,
          parentFolderId: folderTaggedLoop.id,
        },
      ],
      folders: [ROOT_FOLDER, folderTaggedTrack, folderTaggedLoop],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };

    const explorer = buildLibraryFilesExplorerState({
      currentFolderId: ROOT_FOLDER.id,
      savedLoops: [TAGGED_LOOP],
      savedPlaylists: [],
      savedSources: [TAGGED_SOURCE],
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'tracks',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'all',
        selectedTagFilters: ['Alto'],
      },
      tree,
    });

    assert.deepEqual(
      explorer.rows.map((row) => row.label),
      ['Tagged Track Folder'],
    );
  });

  it('leaves the no-filter case byte-for-byte unchanged from current behavior', () => {
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: UNTAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${UNTAGGED_SOURCE.id}`,
          parentFolderId: FOLDER_TRACKS.id,
        },
        {
          entityId: PLAYLIST.id,
          entityKind: 'playlist',
          id: `file-link:playlist:${PLAYLIST.id}`,
          parentFolderId: FOLDER_NO_TRACKS.id,
        },
      ],
      folders: [ROOT_FOLDER, FOLDER_TRACKS, FOLDER_NO_TRACKS],
      rootFolderId: ROOT_FOLDER.id,
      version: 1,
    };
    const baseOptions = {
      currentFolderId: ROOT_FOLDER.id,
      savedLoops: [],
      savedPlaylists: [PLAYLIST],
      savedSources: [UNTAGGED_SOURCE],
      tree,
    };

    const explorerWithoutSearchOptions =
      buildLibraryFilesExplorerState(baseOptions);
    const explorerWithDefaultFilters = buildLibraryFilesExplorerState({
      ...baseOptions,
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'all',
        selectedTagFilters: [],
      },
    });

    assert.deepEqual(explorerWithoutSearchOptions, explorerWithDefaultFilters);
    assert.deepEqual(
      explorerWithoutSearchOptions.rows.map((row) => row.label),
      ['No Tracks Folder', 'Tracks Folder'],
    );
  });
});
