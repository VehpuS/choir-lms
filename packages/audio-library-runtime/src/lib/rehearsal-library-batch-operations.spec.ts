import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  addTrackToPlaylist,
  createDriveAudioSource,
  createPlaylist,
  type NamedLoop,
} from '@org/audio-library-models';
import AsyncStorage, {
  type AsyncStorageStatic,
} from '@react-native-async-storage/async-storage';

import { REHEARSAL_LIBRARY_ROOT_FOLDER_ID } from './rehearsal-library-files';
import { AsyncStoragePracticeRepository } from './rehearsal-playback.js';

const OWNER = 'user-1';
const mutableAsyncStorage = AsyncStorage as unknown as AsyncStorageStatic;
const ORIGINAL = {
  getItem: mutableAsyncStorage.getItem,
  removeItem: mutableAsyncStorage.removeItem,
  setItem: mutableAsyncStorage.setItem,
};

// An in-memory AsyncStorage that also counts writes per key, so tests can
// assert that a batch persists the tree once.
const configureStorage = () => {
  const storage = new Map<string, string>();
  const writes: string[] = [];

  mutableAsyncStorage.getItem = async (key) => storage.get(key) ?? null;
  mutableAsyncStorage.removeItem = async (key) => void storage.delete(key);
  mutableAsyncStorage.setItem = async (key, value) => {
    writes.push(key);
    storage.set(key, value);
  };

  return {
    countTreeWrites: () =>
      writes.filter((key) => key.includes('library-tree')).length,
    resetWrites: () => void writes.splice(0),
  };
};

afterEach(() => {
  Object.assign(mutableAsyncStorage, ORIGINAL);
});

const createSource = (name: string) =>
  createDriveAudioSource({
    availability: { status: 'available' },
    driveFileId: `drive-${name}`,
    durationMs: 60000,
    mimeType: 'audio/mpeg',
    name,
  });

const seedLibrary = async () => {
  const probe = configureStorage();
  const repository = new AsyncStoragePracticeRepository();
  const verse = createSource('Verse.mp3');
  const chorus = createSource('Chorus.mp3');
  const bridge = createSource('Bridge.mp3');

  for (const source of [verse, chorus, bridge]) {
    await repository.saveSource(OWNER, source);
  }

  await repository.saveLibraryFolderNode(OWNER, {
    createdAt: '2026-05-10T10:00:00.000Z',
    id: 'folder-a',
    name: 'Advent',
    parentFolderId: REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
  });

  return { bridge, chorus, probe, repository, verse };
};

const linkIdFor = async (
  repository: AsyncStoragePracticeRepository,
  entityId: string,
) => {
  const tree = await repository.listLibraryFileTree(OWNER);
  const link = tree.fileLinks.find(
    (fileLink) => fileLink.entityId === entityId,
  );

  assert.ok(link);
  return link;
};

describe('saveLibraryNodes', () => {
  it('moves many links in one tree write', async () => {
    const { chorus, probe, repository, verse } = await seedLibrary();
    const verseLink = await linkIdFor(repository, verse.id);
    const chorusLink = await linkIdFor(repository, chorus.id);

    probe.resetWrites();
    const tree = await repository.saveLibraryNodes(OWNER, {
      fileLinks: [verseLink, chorusLink].map((fileLink) => ({
        ...fileLink,
        parentFolderId: 'folder-a',
      })),
    });

    assert.equal(probe.countTreeWrites(), 1);
    assert.deepEqual(
      tree.fileLinks
        .filter((fileLink) => fileLink.parentFolderId === 'folder-a')
        .map((fileLink) => fileLink.entityId)
        .sort(),
      [chorus.id, verse.id].sort(),
    );
  });

  it('writes nothing when a later node in the batch is invalid', async () => {
    const { chorus, probe, repository, verse } = await seedLibrary();
    const verseLink = await linkIdFor(repository, verse.id);
    const chorusLink = await linkIdFor(repository, chorus.id);

    probe.resetWrites();
    await assert.rejects(
      repository.saveLibraryNodes(OWNER, {
        fileLinks: [
          { ...verseLink, parentFolderId: 'folder-a' },
          { ...chorusLink, parentFolderId: 'folder-missing' },
        ],
      }),
      /does not exist/,
    );

    assert.equal(probe.countTreeWrites(), 0);
    const tree = await repository.listLibraryFileTree(OWNER);

    assert.equal(
      tree.fileLinks.find(({ id }) => id === verseLink.id)?.parentFolderId,
      REHEARSAL_LIBRARY_ROOT_FOLDER_ID,
    );
  });

  it('detects a name conflict between two items of the same batch', async () => {
    const { repository, verse } = await seedLibrary();
    const verseLink = await linkIdFor(repository, verse.id);

    await assert.rejects(
      repository.saveLibraryNodes(OWNER, {
        fileLinks: [
          { ...verseLink, id: 'copy-1', parentFolderId: 'folder-a' },
          { ...verseLink, id: 'copy-2', parentFolderId: 'folder-a' },
        ],
      }),
      /already exists in the target folder/,
    );
  });
});

describe('removeLibraryFileLinks', () => {
  it('removes a track whose last link goes, with its loops and playlist entries, in one tree write', async () => {
    const { bridge, chorus, probe, repository, verse } = await seedLibrary();
    const loop: NamedLoop = {
      createdAt: '2026-05-10T10:00:00.000Z',
      endMs: 20000,
      id: 'loop-1',
      name: 'Verse loop',
      ownerId: OWNER,
      sourceId: verse.id,
      sourceName: verse.name,
      startMs: 10000,
      updatedAt: '2026-05-10T10:00:00.000Z',
    } as NamedLoop;

    await repository.saveLoop(loop);
    await repository.savePlaylist(
      addTrackToPlaylist(
        createPlaylist({ name: 'Set', ownerId: OWNER }),
        verse,
      ),
    );
    const verseLink = await linkIdFor(repository, verse.id);

    probe.resetWrites();
    const { collections, tree } = await repository.removeLibraryFileLinks(
      OWNER,
      [verseLink.id],
    );

    assert.equal(probe.countTreeWrites(), 1);
    assert.deepEqual(
      collections.sources.map(({ id }) => id).sort(),
      [bridge.id, chorus.id].sort(),
    );
    assert.equal(collections.loops.length, 0);
    assert.equal(collections.playlists[0]?.items.length, 0);
    assert.equal(
      tree.fileLinks.some(({ entityId }) => entityId === verse.id),
      false,
    );
  });

  it('keeps the entity when another link to it remains', async () => {
    const { repository, verse } = await seedLibrary();
    const verseLink = await linkIdFor(repository, verse.id);

    await repository.saveLibraryFileLink(OWNER, {
      ...verseLink,
      id: 'second-link',
      parentFolderId: 'folder-a',
    });
    const { collections } = await repository.removeLibraryFileLinks(OWNER, [
      'second-link',
    ]);

    assert.ok(collections.sources.some(({ id }) => id === verse.id));
  });
});

describe('removeLibraryEntities', () => {
  it('removes several tracks with their cascade at once', async () => {
    const { bridge, chorus, repository, verse } = await seedLibrary();
    const { collections } = await repository.removeLibraryEntities(OWNER, {
      sourceIds: [verse.id, chorus.id],
    });

    assert.deepEqual(
      collections.sources.map(({ id }) => id),
      [bridge.id],
    );
  });
});

describe('removePlaylistEntries', () => {
  it('removes entries by id in one playlist save and reindexes', async () => {
    const { bridge, chorus, repository, verse } = await seedLibrary();
    let playlist = createPlaylist({ name: 'Set', ownerId: OWNER });

    for (const source of [verse, chorus, bridge]) {
      playlist = addTrackToPlaylist(playlist, source);
    }

    await repository.savePlaylist(playlist);
    const [first, , third] = playlist.items;
    const [saved] = await repository.removePlaylistEntries(OWNER, playlist.id, [
      first.id,
      third.id,
    ]);

    assert.deepEqual(
      saved.items.map(({ sourceId, sortIndex }) => [sourceId, sortIndex]),
      [[chorus.id, 0]],
    );
  });
});

describe('updateLibraryTags', () => {
  it('adds and removes tags across targets, leaving untouched tags alone', async () => {
    const { chorus, repository, verse } = await seedLibrary();

    await repository.saveSource(OWNER, { ...verse, tags: ['Soprano', 'Alto'] });
    await repository.saveSource(OWNER, { ...chorus, tags: ['Alto'] });
    await repository.updateLibraryTags(OWNER, {
      add: ['Latin'],
      remove: ['alto'],
      targets: [
        { id: verse.id, kind: 'track' },
        { id: chorus.id, kind: 'track' },
        { id: 'folder-a', kind: 'folder' },
      ],
    });

    const sources = await repository.listSources(OWNER);
    const tree = await repository.listLibraryFileTree(OWNER);

    assert.deepEqual(sources.find(({ id }) => id === verse.id)?.tags, [
      'Soprano',
      'Latin',
    ]);
    assert.deepEqual(sources.find(({ id }) => id === chorus.id)?.tags, [
      'Latin',
    ]);
    assert.deepEqual(tree.folders.find(({ id }) => id === 'folder-a')?.tags, [
      'Latin',
    ]);
  });

  it('does not touch entities that are not targeted', async () => {
    const { bridge, repository, verse } = await seedLibrary();

    await repository.updateLibraryTags(OWNER, {
      add: ['Latin'],
      targets: [{ id: verse.id, kind: 'track' }],
    });

    const sources = await repository.listSources(OWNER);

    assert.equal(sources.find(({ id }) => id === bridge.id)?.tags, undefined);
  });
});
