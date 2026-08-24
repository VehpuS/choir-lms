import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createDriveAudioSource,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';

import { buildLibraryFilesExplorerState } from './library-files-model';
import { LIBRARY_ROOT_FOLDER } from './library-files-model-test-fixtures';

const ALTO_TAGGED_SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-alto-tagged',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-05T09:00:00.000Z',
  name: 'Alto Warmup.mp3',
  tags: ['Alto'],
});

const BASS_TAGGED_SOURCE = createDriveAudioSource({
  availability: { status: 'available' },
  driveFileId: 'drive-file-bass-tagged',
  durationMs: 245000,
  mimeType: 'audio/mpeg',
  modifiedTime: '2026-07-05T09:00:00.000Z',
  name: 'Bass Section.mp3',
  tags: ['Bass'],
});

describe('library-files model tag match mode', () => {
  it('an any-mode Tags filter surfaces plain-browsing entities matching just one of the selected tags', () => {
    const folderAlto = {
      id: 'folder-alto',
      name: 'Alto Folder',
      parentFolderId: LIBRARY_ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const folderBass = {
      id: 'folder-bass',
      name: 'Bass Folder',
      parentFolderId: LIBRARY_ROOT_FOLDER.id,
      createdAt: '2026-05-10T10:00:00.000Z',
    };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: ALTO_TAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${ALTO_TAGGED_SOURCE.id}`,
          parentFolderId: folderAlto.id,
        },
        {
          entityId: BASS_TAGGED_SOURCE.id,
          entityKind: 'track',
          id: `file-link:track:${BASS_TAGGED_SOURCE.id}`,
          parentFolderId: folderBass.id,
        },
      ],
      folders: [LIBRARY_ROOT_FOLDER, folderAlto, folderBass],
      rootFolderId: LIBRARY_ROOT_FOLDER.id,
      version: 1,
    };
    const baseOptions = {
      currentFolderId: LIBRARY_ROOT_FOLDER.id,
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [ALTO_TAGGED_SOURCE, BASS_TAGGED_SOURCE],
      tree,
    };

    const explorerUnderAll = buildLibraryFilesExplorerState({
      ...baseOptions,
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'all',
        selectedTagFilters: ['Alto', 'Bass'],
      },
    });

    assert.deepEqual(
      explorerUnderAll.rows.map((row) => row.label),
      [],
    );

    const explorerUnderAny = buildLibraryFilesExplorerState({
      ...baseOptions,
      searchOptions: {
        activeSearchQuery: null,
        entityFilter: 'all',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'any',
        selectedTagFilters: ['Alto', 'Bass'],
      },
    });

    assert.deepEqual(explorerUnderAny.rows.map((row) => row.label).sort(), [
      'Alto Folder',
      'Bass Folder',
    ]);
  });

  it('an any-mode Tags filter surfaces Files search results matching just one of the selected tags', () => {
    const altoSource = { ...ALTO_TAGGED_SOURCE, name: 'Alto Warm.mp3' };
    const bassSource = { ...BASS_TAGGED_SOURCE, name: 'Bass Warm.mp3' };
    const tree: RehearsalLibraryFileTree = {
      fileLinks: [
        {
          entityId: altoSource.id,
          entityKind: 'track',
          id: `file-link:track:${altoSource.id}`,
          parentFolderId: LIBRARY_ROOT_FOLDER.id,
          visibleName: 'Alto Warm',
        },
        {
          entityId: bassSource.id,
          entityKind: 'track',
          id: `file-link:track:${bassSource.id}`,
          parentFolderId: LIBRARY_ROOT_FOLDER.id,
          visibleName: 'Bass Warm',
        },
      ],
      folders: [LIBRARY_ROOT_FOLDER],
      rootFolderId: LIBRARY_ROOT_FOLDER.id,
      version: 1,
    };
    const baseOptions = {
      currentFolderId: LIBRARY_ROOT_FOLDER.id,
      savedLoops: [],
      savedPlaylists: [],
      savedSources: [altoSource, bassSource],
      tree,
    };

    const explorerUnderAll = buildLibraryFilesExplorerState({
      ...baseOptions,
      searchOptions: {
        activeSearchQuery: 'warm',
        entityFilter: 'all',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'all',
        selectedTagFilters: ['Alto', 'Bass'],
      },
    });

    assert.deepEqual(
      explorerUnderAll.rows.map((row) => row.label),
      [],
    );

    const explorerUnderAny = buildLibraryFilesExplorerState({
      ...baseOptions,
      searchOptions: {
        activeSearchQuery: 'warm',
        entityFilter: 'all',
        searchScope: 'current-folder',
        tagFilterMatchMode: 'any',
        selectedTagFilters: ['Alto', 'Bass'],
      },
    });

    assert.deepEqual(explorerUnderAny.rows.map((row) => row.label).sort(), [
      'Alto Warm',
      'Bass Warm',
    ]);
  });
});
