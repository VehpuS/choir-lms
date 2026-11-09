import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  createCompositeTrack,
  createDriveAudioSource,
  type CompositeTrack,
  type RehearsalLibraryFileTree,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import {
  listStoredComposites,
  updateStoredComposites,
} from './composites-storage.js';
import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from './rehearsal-library-files.js';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

// Composites are files (composite-tracks 7.4): they share the library file
// tree with tracks, loops and playlists. These specs run the real repository
// over an in-memory AsyncStorage, the same way the composite storage spec does.

const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};
const OWNER_ID = 'user-1';
const FOLDER_ID = 'folder:ubi-caritas';
const CREATED_AT = '2026-11-09T10:00:00.000Z';

afterEach(() => {
  mutableAsyncStorage.getItem = ORIGINAL.getItem;
  mutableAsyncStorage.removeItem = ORIGINAL.removeItem;
  mutableAsyncStorage.setItem = ORIGINAL.setItem;
});

const useMemoryStorage = () => {
  const storage = new Map<string, string>();

  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => {
    storage.delete(key);
  };
  mutableAsyncStorage.setItem = async (key, value) => {
    storage.set(key, value);
  };
};

const track = (driveFileId: string) =>
  createDriveAudioSource({
    driveFileId,
    name: driveFileId,
    mimeType: 'audio/mpeg',
    availability: { status: 'available' },
  } as Parameters<typeof createDriveAudioSource>[0]);

const makeComposite = (id: string, trackIds: string[]): CompositeTrack => {
  const made = createCompositeTrack({
    draft: {
      name: id,
      stems: trackIds.map((trackId) => ({ trackId, name: trackId })),
    },
    createId: () => id,
    createdAt: CREATED_AT,
  });

  assert.ok(made);

  return made;
};

/** A library with two tracks and one composite of them, in the root folder. */
const seed = async () => {
  useMemoryStorage();

  const repository = new AsyncStoragePracticeRepository();
  const alto = track('alto');
  const bass = track('bass');

  await repository.saveSource(OWNER_ID, alto);
  await repository.saveSource(OWNER_ID, bass);

  const composite = makeComposite('ubi', [alto.id, bass.id]);

  await updateStoredComposites(OWNER_ID, () => [composite]);

  return { alto, bass, composite, repository };
};

const compositeLinks = (tree: RehearsalLibraryFileTree) =>
  tree.fileLinks.filter(({ entityKind }) => entityKind === 'composite');

describe('composite file links', () => {
  it('lists a stored composite in the root folder beside its stems', async () => {
    const { alto, composite, repository } = await seed();
    const tree = await repository.listLibraryFileTree(OWNER_ID);

    assert.deepEqual(
      compositeLinks(tree).map((link) => [link.entityId, link.parentFolderId]),
      [[composite.id, REHEARSAL_LIBRARY_ROOT_FOLDER_ID]],
    );
    assert.ok(
      tree.fileLinks.some(
        (link) => link.entityKind === 'track' && link.entityId === alto.id,
      ),
    );
  });

  it('keeps a composite in the folder it was moved to, leaving its stems', async () => {
    const { alto, composite, repository } = await seed();

    await repository.saveLibraryFolderNode(OWNER_ID, {
      id: FOLDER_ID,
      name: 'Ubi caritas',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      createdAt: CREATED_AT,
    });
    await repository.saveLibraryFileLink(OWNER_ID, {
      id: `file-link:composite:${composite.id}`,
      parentFolderId: FOLDER_ID,
      entityKind: 'composite',
      entityId: composite.id,
    });

    const tree = await repository.listLibraryFileTree(OWNER_ID);

    assert.equal(compositeLinks(tree)[0]?.parentFolderId, FOLDER_ID);
    assert.equal(
      tree.fileLinks.find((link) => link.entityId === alto.id)?.parentFolderId,
      REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    );
  });

  it('drops the link when the composite record is gone', async () => {
    const { repository } = await seed();

    await repository.listLibraryFileTree(OWNER_ID);
    await updateStoredComposites(OWNER_ID, () => []);

    assert.deepEqual(
      compositeLinks(await repository.listLibraryFileTree(OWNER_ID)),
      [],
    );
  });

  it('deleting a composite file deletes the record and leaves the stems', async () => {
    const { alto, bass, composite, repository } = await seed();
    const [link] = compositeLinks(
      await repository.listLibraryFileTree(OWNER_ID),
    );

    await repository.deleteLibraryFileLink(OWNER_ID, link.id);

    assert.deepEqual(await listStoredComposites(OWNER_ID), []);
    assert.deepEqual(
      (await repository.listSources(OWNER_ID)).map(({ id }) => id).sort(),
      [alto.id, bass.id].sort(),
    );
    assert.equal(
      (await repository.listComposites(OWNER_ID)).some(
        ({ id }) => id === composite.id,
      ),
      false,
    );
  });

  it('deleting a folder deletes the composites inside it', async () => {
    const { composite, repository } = await seed();

    await repository.saveLibraryFolderNode(OWNER_ID, {
      id: FOLDER_ID,
      name: 'Ubi caritas',
      parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
      createdAt: CREATED_AT,
    });
    await repository.saveLibraryFileLink(OWNER_ID, {
      id: `file-link:composite:${composite.id}`,
      parentFolderId: FOLDER_ID,
      entityKind: 'composite',
      entityId: composite.id,
    });
    await repository.deleteLibraryFolderNode(OWNER_ID, FOLDER_ID);

    assert.deepEqual(await listStoredComposites(OWNER_ID), []);
  });

  it('refuses a second file with the same name in one folder', async () => {
    const { composite, repository } = await seed();

    await assert.rejects(
      repository.saveLibraryFileLink(OWNER_ID, {
        id: `file-link:composite:${composite.id}`,
        parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
        entityKind: 'composite',
        entityId: composite.id,
        visibleName: 'alto',
      }),
      /already exists/,
    );
  });
});
